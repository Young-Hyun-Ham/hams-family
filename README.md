# hams-family

## 프로젝트 생성 (PowerShell)

```bash
# 생성전에 node version을 확인 권장버전 v20.19.4
----------------------

node -v
nvm install 20.19.4
nvm use 20.19.4
# nvm 설치가 되어 있지 않다면 아래 링크에서 nvm-setup.exe 다운로드
https://github.com/coreybutler/nvm-windows/releases
# powershell 닫앗다가 다시 실행
nvm version
# npm 최신으로 맞추기
npm install -g npm
npm -v
# 혹 프로젝트 빌드 또는 의존성이 설치 되어 있다면 프로젝트 재설치
Remove-Item -Recurse -Force .expo
Remove-Item -Recurse -Force node_modules
Remove-Item -Force package-lock.json
npm cache clean --force
npm install

-----------------------

# 1) Expo 앱 생성
npx create-expo-app hams-family -t

cd hams-family

# 2) 라우팅(Expo Router) + Firebase 설치
npx expo install expo-router react-native-safe-area-context react-native-screens
npm i firebase

# 3) 실행
android     |	npx expo start --android | 에뮬레이터나 연결된 기기에서 즉시 실행
iOS	        | npx expo start --ios     | macOS 환경에서 시뮬레이터 실행 시
web	        | npx expo start --web     | 브라우저에서 실행
Integration | npx expo start           | QR 코드와 함께 선택 메뉴(a, i, w) 노출
```

---

## 초기 폴더 구조

```bash
HAMS-FAMILY
├─ app/                     ← expo-router 전용 (화면만)
│   ├─ (auth)/
│   │   └─ login.tsx
│   ├─ (tabs)/
│   ├─ _layout.tsx
│   ├─ index.tsx
│   └─ modal.tsx
│
├─ src/                     ← ⭐ 모든 로직은 여기
│   ├─ components/          ← 공용 UI 컴포넌트
│   ├─ hooks/               ← 커스텀 훅
│   ├─ lib/                 ← firebase, api 등 외부 연동
│   │   └─ firebase.ts
│   ├─ utils/               ← 전역 유틸 (alert, error 등)
│   │   ├─ alert.ts
│   │   └─ error.ts
│   ├─ types/
│   └─ store/               ← (나중에 Zustand 등)
│
├─ assets/
├─ .env
├─ app.json
└─ tsconfig.json
```

---

## Firebase 환경변수 (웹/모바일 공용)

- app.config.ts 생성

```typescript
import "dotenv/config";

export default ({ config }: any) => ({
  ...config,
  name: "hams-family",
  slug: "hams-family",
  extra: {
    EXPO_PUBLIC_FIREBASE_API_KEY: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
    EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN:
      process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
    EXPO_PUBLIC_FIREBASE_PROJECT_ID:
      process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
    EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET:
      process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
    EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID:
      process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    EXPO_PUBLIC_FIREBASE_APP_ID: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
  },
});
```

- .env 생성

```env
EXPO_PUBLIC_FIREBASE_API_KEY=YOUR_KEY
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=YOUR_DOMAIN
EXPO_PUBLIC_FIREBASE_PROJECT_ID=YOUR_PROJECT_ID
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=YOUR_BUCKET
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=YOUR_SENDER_ID
EXPO_PUBLIC_FIREBASE_APP_ID=YOUR_APP_ID
```
