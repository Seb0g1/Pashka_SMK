# Pashka_SMK

Мобильное приложение для подачи технических заявок по QR-кодам оборудования.

## Что внутри

- Expo SDK 54 / React Native / Expo Go.
- PostgreSQL как основная база данных.
- Node.js + Express API между мобильным приложением и PostgreSQL.
- Роли пользователей: администратор, диспетчер, ремонтная служба, оператор.
- QR-коды станков хранятся в PostgreSQL и сканируются через камеру.
- Журнал заявок, история статусов, права доступа по ролям.

## Демо-логины

| Логин | Пароль | Роль |
| --- | --- | --- |
| `admin` | `admin123` | Администратор |
| `dispatcher` | `disp123` | Диспетчер |
| `master` | `master123` | Ремонтная служба |
| `operator` | `operator123` | Оператор |
| `anna` | `anna123` | Оператор |

## Локальный запуск

Установить зависимости:

```bash
npm install
npm --prefix server install
```

Запустить PostgreSQL через Docker:

```bash
docker compose up -d postgres
```

Создать настройки API:

```bash
cp server/.env.example server/.env
```

Запустить API:

```bash
npm run api
```

В отдельном терминале запустить Expo. Вместо `192.168.0.10` укажите IP компьютера в вашей Wi-Fi сети:

```bash
EXPO_PUBLIC_API_URL=http://192.168.0.10:3001 npm run start:lan
```

Откройте QR-код в Expo Go на телефоне.

## Деплой на Linux-сервер для защиты

Установить Node.js, Git и Docker:

```bash
sudo apt update
sudo apt install -y git curl ca-certificates
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs docker.io docker-compose-plugin
sudo systemctl enable --now docker
```

Скачать проект:

```bash
git clone https://github.com/Seb0g1/Pashka_SMK.git
cd Pashka_SMK
npm install
npm --prefix server install
cp server/.env.example server/.env
```

Запустить PostgreSQL:

```bash
sudo docker compose up -d postgres
```

Запустить API в `tmux`:

```bash
sudo apt install -y tmux
tmux new -s smk-api
npm run api
```

Отсоединиться от `tmux`: `Ctrl+B`, потом `D`.

Если телефон и сервер в одной сети, запустить Expo через LAN:

```bash
EXPO_PUBLIC_API_URL=http://SERVER_IP:3001 npm run start:lan
```

Если сервер удаленный или сеть мешает подключению, запустить Expo через tunnel:

```bash
EXPO_PUBLIC_API_URL=http://SERVER_IP:3001 npm run start:tunnel
```

Для возврата к API:

```bash
tmux attach -t smk-api
```

## Важно для Expo Go

- Телефон должен видеть API по адресу `EXPO_PUBLIC_API_URL`.
- На Linux-сервере откройте порт `3001`, если включен firewall.
- Expo Go должен быть совместим с SDK 54.
- API автоматически создает таблицы и демо-данные при первом запуске.
- QR-коды сохраняются в таблице `machine_qr_codes`, поэтому после перезапуска PostgreSQL они остаются в базе.
