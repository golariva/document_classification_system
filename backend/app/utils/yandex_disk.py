import requests

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