import requests
from urllib.parse import quote

YANDEX_TOKEN = "y0__xDu97aHARiujUAggrSzghe8XRb2owjA96-3s7NY-6lfjntNGg"

def ensure_folder(path):
    """
    Создаёт папку на Яндекс.Диске и все родительские папки.
    """
    import requests

    headers = {"Authorization": f"OAuth {YANDEX_TOKEN}"}

    # разбиваем путь по "/"
    parts = path.strip("/").split("/")
    current = ""
    for part in parts:
        current += f"/{part}"
        res = requests.put(
            "https://cloud-api.yandex.net/v1/disk/resources",
            headers=headers,
            params={"path": current}
        )
        if res.status_code not in [201, 409]:
            print("Ошибка создания папки:", res.text)

def create_folder(path):
    headers = {
        "Authorization": f"OAuth {YANDEX_TOKEN}"
    }

    res = requests.put(
        "https://cloud-api.yandex.net/v1/disk/resources",
        headers=headers,
        params={"path": path}
    )

    # если папка уже есть — это нормально
    if res.status_code not in [201, 409]:
        print("Ошибка создания папки:", res.text)

def upload_to_yandex(local_path, cloud_path):
    headers = {
        "Authorization": f"OAuth {YANDEX_TOKEN}"
    }

    # получаем ссылку для загрузки
    res = requests.get(
        "https://cloud-api.yandex.net/v1/disk/resources/upload",
        headers=headers,
        params={"path": cloud_path, "overwrite": "true"}
    )

    if res.status_code != 200:
        print("Ошибка получения ссылки:", res.text)
        return

    upload_url = res.json().get("href")

    # загружаем файл
    with open(local_path, "rb") as f:
        upload_res = requests.put(upload_url, files={"file": f})

    if upload_res.status_code not in [200, 201]:
        print("Ошибка загрузки:", upload_res.text)

def file_exists(path: str):
    url = "https://cloud-api.yandex.net/v1/disk/resources"
    headers = {"Authorization": f"OAuth {YANDEX_TOKEN}"}
    params = {"path": path}

    res = requests.get(url, headers=headers, params=params)

    return res.status_code == 200

def find_file_by_name(filename: str):
    url = "https://cloud-api.yandex.net/v1/disk/resources/files"

    headers = {
        "Authorization": f"OAuth {YANDEX_TOKEN}"
    }

    params = {
        "limit": 1000
    }

    response = requests.get(url, headers=headers, params=params)

    if response.status_code != 200:
        return None

    for item in response.json().get("items", []):
        if item.get("name") == filename:
            path = item.get("path")

            if path.startswith("disk:/8.2 НИУ ВШЭ - Пермь"):
                return path

    return None