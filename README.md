# Pashka_SMK

РњРѕР±РёР»СЊРЅРѕРµ РїСЂРёР»РѕР¶РµРЅРёРµ РґР»СЏ РїРѕРґР°С‡Рё С‚РµС…РЅРёС‡РµСЃРєРёС… Р·Р°СЏРІРѕРє РїРѕ QR-РєРѕРґР°Рј РѕР±РѕСЂСѓРґРѕРІР°РЅРёСЏ.

## Р§С‚Рѕ РІРЅСѓС‚СЂРё

- Expo SDK 54 / React Native / Expo Go.
- PostgreSQL РєР°Рє РѕСЃРЅРѕРІРЅР°СЏ Р±Р°Р·Р° РґР°РЅРЅС‹С….
- Node.js + Express API РјРµР¶РґСѓ РјРѕР±РёР»СЊРЅС‹Рј РїСЂРёР»РѕР¶РµРЅРёРµРј Рё PostgreSQL.
- Р РѕР»Рё РїРѕР»СЊР·РѕРІР°С‚РµР»РµР№: Р°РґРјРёРЅРёСЃС‚СЂР°С‚РѕСЂ, РґРёСЃРїРµС‚С‡РµСЂ, СЂРµРјРѕРЅС‚РЅР°СЏ СЃР»СѓР¶Р±Р°, РѕРїРµСЂР°С‚РѕСЂ.
- QR-РєРѕРґС‹ СЃС‚Р°РЅРєРѕРІ С…СЂР°РЅСЏС‚СЃСЏ РІ PostgreSQL Рё СЃРєР°РЅРёСЂСѓСЋС‚СЃСЏ С‡РµСЂРµР· РєР°РјРµСЂСѓ.
- Р–СѓСЂРЅР°Р» Р·Р°СЏРІРѕРє, РёСЃС‚РѕСЂРёСЏ СЃС‚Р°С‚СѓСЃРѕРІ, РїСЂР°РІР° РґРѕСЃС‚СѓРїР° РїРѕ СЂРѕР»СЏРј.

## Р”РµРјРѕ-Р»РѕРіРёРЅС‹

| Р›РѕРіРёРЅ | РџР°СЂРѕР»СЊ | Р РѕР»СЊ |
| --- | --- | --- |
| `admin` | `admin123` | РђРґРјРёРЅРёСЃС‚СЂР°С‚РѕСЂ |
| `dispatcher` | `disp123` | Р”РёСЃРїРµС‚С‡РµСЂ |
| `master` | `master123` | Р РµРјРѕРЅС‚РЅР°СЏ СЃР»СѓР¶Р±Р° |
| `operator` | `operator123` | РћРїРµСЂР°С‚РѕСЂ |
| `anna` | `anna123` | РћРїРµСЂР°С‚РѕСЂ |

## Р›РѕРєР°Р»СЊРЅС‹Р№ Р·Р°РїСѓСЃРє

РЈСЃС‚Р°РЅРѕРІРёС‚СЊ Р·Р°РІРёСЃРёРјРѕСЃС‚Рё:

```bash
npm install
npm --prefix server install
```

Р—Р°РїСѓСЃС‚РёС‚СЊ PostgreSQL С‡РµСЂРµР· Docker:

```bash
docker compose up -d postgres
```

РљРѕРЅС‚РµР№РЅРµСЂ РїСѓР±Р»РёРєСѓРµС‚ PostgreSQL РЅР° РїРѕСЂС‚Сѓ `5433`, С‡С‚РѕР±С‹ РЅРµ РєРѕРЅС„Р»РёРєС‚РѕРІР°С‚СЊ СЃ СЃРёСЃС‚РµРјРЅС‹Рј PostgreSQL РЅР° `5432`.

Р•СЃР»Рё РЅР° СЃРµСЂРІРµСЂРµ СЃС‚Р°СЂС‹Р№ Docker Рё РєРѕРјР°РЅРґР° `docker compose` РїР°РґР°РµС‚, Р·Р°РїСѓСЃС‚РёС‚Рµ Р±РµР· compose:

```bash
docker rm -f smk-postgres 2>/dev/null || true
docker volume create smk_postgres_data
docker run -d --name smk-postgres --restart unless-stopped \
  -e POSTGRES_DB=smk \
  -e POSTGRES_USER=smk \
  -e POSTGRES_PASSWORD=smk_password \
  -p 5433:5432 \
  -v smk_postgres_data:/var/lib/postgresql/data \
  postgres:16
```

РЎРѕР·РґР°С‚СЊ РЅР°СЃС‚СЂРѕР№РєРё API:

```bash
cp server/.env.example server/.env
```

Р—Р°РїСѓСЃС‚РёС‚СЊ API:

```bash
npm run api
```

Р’ РѕС‚РґРµР»СЊРЅРѕРј С‚РµСЂРјРёРЅР°Р»Рµ Р·Р°РїСѓСЃС‚РёС‚СЊ Expo. Р’РјРµСЃС‚Рѕ `192.168.0.10` СѓРєР°Р¶РёС‚Рµ IP РєРѕРјРїСЊСЋС‚РµСЂР° РІ РІР°С€РµР№ Wi-Fi СЃРµС‚Рё:

```bash
EXPO_PUBLIC_API_URL=http://192.168.0.10:6666 npm run start:lan
```

РћС‚РєСЂРѕР№С‚Рµ QR-РєРѕРґ РІ Expo Go РЅР° С‚РµР»РµС„РѕРЅРµ.

## Р”РµРїР»РѕР№ РЅР° Linux-СЃРµСЂРІРµСЂ РґР»СЏ Р·Р°С‰РёС‚С‹

РЈСЃС‚Р°РЅРѕРІРёС‚СЊ Node.js, Git Рё Docker:

```bash
sudo apt update
sudo apt install -y git curl ca-certificates
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs docker.io docker-compose-plugin
sudo systemctl enable --now docker
```

РЎРєР°С‡Р°С‚СЊ РїСЂРѕРµРєС‚:

```bash
git clone https://github.com/Seb0g1/Pashka_SMK.git
cd Pashka_SMK
npm install
npm --prefix server install
cp server/.env.example server/.env
```

Р—Р°РїСѓСЃС‚РёС‚СЊ PostgreSQL:

```bash
sudo docker compose up -d postgres
```

Р•СЃР»Рё РїРѕСЏРІР»СЏРµС‚СЃСЏ РѕС€РёР±РєР° РІСЂРѕРґРµ `unknown shorthand flag: d in -d`, Р·РЅР°С‡РёС‚ Docker Compose РЅРµРґРѕСЃС‚СѓРїРµРЅ. Р—Р°РїСѓСЃС‚РёС‚Рµ РєРѕРЅС‚РµР№РЅРµСЂ РЅР°РїСЂСЏРјСѓСЋ:

```bash
sudo docker rm -f smk-postgres 2>/dev/null || true
sudo docker volume create smk_postgres_data
sudo docker run -d --name smk-postgres --restart unless-stopped \
  -e POSTGRES_DB=smk \
  -e POSTGRES_USER=smk \
  -e POSTGRES_PASSWORD=smk_password \
  -p 5433:5432 \
  -v smk_postgres_data:/var/lib/postgresql/data \
  postgres:16
```

РџСЂРѕРІРµСЂСЊС‚Рµ, С‡С‚Рѕ API СЃРјРѕС‚СЂРёС‚ РЅР° РїРѕСЂС‚ `5433`:

```bash
grep DATABASE_URL server/.env
```

Р—Р°РїСѓСЃС‚РёС‚СЊ API РІ `tmux`:

```bash
sudo apt install -y tmux
tmux new -s smk-api
npm run api
```

РћС‚СЃРѕРµРґРёРЅРёС‚СЊСЃСЏ РѕС‚ `tmux`: `Ctrl+B`, РїРѕС‚РѕРј `D`.

Р•СЃР»Рё С‚РµР»РµС„РѕРЅ Рё СЃРµСЂРІРµСЂ РІ РѕРґРЅРѕР№ СЃРµС‚Рё, Р·Р°РїСѓСЃС‚РёС‚СЊ Expo С‡РµСЂРµР· LAN:

```bash
EXPO_PUBLIC_API_URL=http://SERVER_IP:6666 npm run start:lan
```

Р•СЃР»Рё СЃРµСЂРІРµСЂ СѓРґР°Р»РµРЅРЅС‹Р№ РёР»Рё СЃРµС‚СЊ РјРµС€Р°РµС‚ РїРѕРґРєР»СЋС‡РµРЅРёСЋ, Р·Р°РїСѓСЃС‚РёС‚СЊ Expo С‡РµСЂРµР· tunnel:

```bash
EXPO_PUBLIC_API_URL=http://SERVER_IP:6666 npm run start:tunnel
```

Р”Р»СЏ РІРѕР·РІСЂР°С‚Р° Рє API:

```bash
tmux attach -t smk-api
```

## Р’Р°Р¶РЅРѕ РґР»СЏ Expo Go

- РўРµР»РµС„РѕРЅ РґРѕР»Р¶РµРЅ РІРёРґРµС‚СЊ API РїРѕ Р°РґСЂРµСЃСѓ `EXPO_PUBLIC_API_URL`.
- РќР° Linux-СЃРµСЂРІРµСЂРµ РѕС‚РєСЂРѕР№С‚Рµ РїРѕСЂС‚ `6666`, РµСЃР»Рё РІРєР»СЋС‡РµРЅ firewall.
- Expo Go РґРѕР»Р¶РµРЅ Р±С‹С‚СЊ СЃРѕРІРјРµСЃС‚РёРј СЃ SDK 54.
- API Р°РІС‚РѕРјР°С‚РёС‡РµСЃРєРё СЃРѕР·РґР°РµС‚ С‚Р°Р±Р»РёС†С‹ Рё РґРµРјРѕ-РґР°РЅРЅС‹Рµ РїСЂРё РїРµСЂРІРѕРј Р·Р°РїСѓСЃРєРµ.
- Р•СЃР»Рё РЅР° СЃРµСЂРІРµСЂРµ СѓР¶Рµ РµСЃС‚СЊ PostgreSQL РЅР° `5432`, РѕСЃС‚Р°РІСЊС‚Рµ РїСЂРѕРµРєС‚РЅС‹Р№ PostgreSQL РЅР° `5433`.
- QR-РєРѕРґС‹ СЃРѕС…СЂР°РЅСЏСЋС‚СЃСЏ РІ С‚Р°Р±Р»РёС†Рµ `machine_qr_codes`, РїРѕСЌС‚РѕРјСѓ РїРѕСЃР»Рµ РїРµСЂРµР·Р°РїСѓСЃРєР° PostgreSQL РѕРЅРё РѕСЃС‚Р°СЋС‚СЃСЏ РІ Р±Р°Р·Рµ.

