import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { StatusBar as ExpoStatusBar } from "expo-status-bar";
import { CameraView, useCameraPermissions } from "expo-camera";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import QRCode from "react-native-qrcode-svg";

const QR_BASE_URL = "smk-tech-request://new";
const DEFAULT_API_URL = "http://192.168.0.123:6666";
const API_BASE_URL = (process.env.EXPO_PUBLIC_API_URL || DEFAULT_API_URL).replace(/\/$/, "");

const colors = {
  bg: "#f3f6f8",
  surface: "#ffffff",
  surfaceSoft: "#edf4f8",
  line: "#d7e0e8",
  text: "#17212b",
  muted: "#667382",
  blue: "#1f5f8d",
  blueDark: "#164968",
  red: "#b83238",
  amber: "#b26a00",
  green: "#2f7b5d",
  slate: "#32465a",
};

const images = {
  plant: require("./assets/plant.jpg"),
  machine: require("./assets/machine.jpg"),
  shop: require("./assets/shop.jpg"),
};

const roleConfig = {
  admin: {
    label: "Администратор",
    short: "Админ",
    color: colors.red,
    scope: "Все заявки и пользователи",
  },
  dispatcher: {
    label: "Диспетчер",
    short: "Диспетчер",
    color: colors.blue,
    scope: "Все заявки и статусы",
  },
  technician: {
    label: "Ремонтная служба",
    short: "Ремонт",
    color: colors.green,
    scope: "Назначенные заявки",
  },
  operator: {
    label: "Оператор",
    short: "Оператор",
    color: colors.amber,
    scope: "Свои заявки и создание",
  },
};

const demoUsers = [
  {
    login: "admin",
    password: "admin123",
    fullName: "Алексей Орлов",
    role: "admin",
    position: "Администратор системы",
    department: "ИТ-служба",
    phone: "+7 900 100-10-01",
  },
  {
    login: "dispatcher",
    password: "disp123",
    fullName: "Ольга Смирнова",
    role: "dispatcher",
    position: "Диспетчер ремонтной службы",
    department: "Производственная диспетчерская",
    phone: "+7 900 100-10-02",
  },
  {
    login: "master",
    password: "master123",
    fullName: "Павел Морозов",
    role: "technician",
    position: "Мастер ремонтной смены",
    department: "Ремонтно-механический участок",
    phone: "+7 900 100-10-03",
  },
  {
    login: "operator",
    password: "operator123",
    fullName: "Иван Петров",
    role: "operator",
    position: "Оператор линии",
    department: "Механический цех",
    phone: "+7 900 100-10-04",
  },
  {
    login: "anna",
    password: "anna123",
    fullName: "Анна Соколова",
    role: "operator",
    position: "Оператор пресса",
    department: "Кузнечно-прессовый комплекс",
    phone: "+7 900 100-10-05",
  },
];

const seedMachines = [
  {
    id: "SMK-CNC-014",
    name: "Станок ЧПУ HAAS VF-4",
    area: "Механический цех",
    line: "Линия механообработки",
    responsible: "Мастер ремонтной смены",
    responsibleLogin: "master",
    status: "Работает",
    imageKey: "machine",
  },
  {
    id: "SMK-PRESS-022",
    name: "Кривошипный пресс КД2128",
    area: "Кузнечно-прессовый комплекс",
    line: "Участок прессования",
    responsible: "Мастер ремонтной смены",
    responsibleLogin: "master",
    status: "Требует осмотра",
    imageKey: "shop",
  },
  {
    id: "SMK-FURN-007",
    name: "Печь термообработки ПТ-7",
    area: "Термический участок",
    line: "Линия термообработки",
    responsible: "Диспетчер ремонтной службы",
    responsibleLogin: "dispatcher",
    status: "Работает",
    imageKey: "plant",
  },
];

const seedRequests = [
  {
    publicId: "TZ-1049",
    machineId: "SMK-PRESS-022",
    problemType: "Механика",
    priority: "Высокий",
    description:
      "Посторонний стук при ходе ползуна. Оператор остановил работу до осмотра.",
    reporterLogin: "anna",
    assigneeLogin: "master",
    status: "В работе",
    createdAt: "2026-05-10T12:42:00.000Z",
  },
  {
    publicId: "TZ-1048",
    machineId: "SMK-CNC-014",
    problemType: "Электрика",
    priority: "Средний",
    description:
      "Периодически пропадает сигнал датчика закрытия двери защитного кожуха.",
    reporterLogin: "operator",
    assigneeLogin: "master",
    status: "Новая",
    createdAt: "2026-05-10T11:10:00.000Z",
  },
  {
    publicId: "TZ-1047",
    machineId: "SMK-FURN-007",
    problemType: "Температура",
    priority: "Критический",
    description:
      "Температура камеры не выходит на заданный режим, партия поставлена на паузу.",
    reporterLogin: "dispatcher",
    assigneeLogin: "dispatcher",
    status: "Ожидает детали",
    createdAt: "2026-05-09T15:30:00.000Z",
  },
];

const statuses = ["Новая", "В работе", "Ожидает детали", "Выполнена"];
const problemTypes = [
  "Механика",
  "Электрика",
  "Гидравлика",
  "Температура",
  "ПО/ЧПУ",
  "Безопасность",
];
const priorities = ["Низкий", "Средний", "Высокий", "Критический"];

export default function App() {
  const mainScrollRef = useRef(null);
  const [apiReady, setApiReady] = useState(false);
  const [boot, setBoot] = useState({ loading: true, error: "" });
  const [authError, setAuthError] = useState("");
  const [authToken, setAuthToken] = useState("");
  const [currentUser, setCurrentUser] = useState(null);
  const [screen, setScreen] = useState("home");
  const [machines, setMachines] = useState([]);
  const [requests, setRequests] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [selectedMachineId, setSelectedMachineId] = useState("");
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [requestHistory, setRequestHistory] = useState([]);
  const [filter, setFilter] = useState("Все");
  const [qrMode, setQrMode] = useState("code");
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function startApi() {
      try {
        await apiRequest("/health", { auth: false });
        if (mounted) {
          setApiReady(true);
          setBoot({ loading: false, error: "" });
        }
      } catch (error) {
        if (mounted) {
          setBoot({
            loading: false,
            error: getErrorMessage(error),
          });
        }
      }
    }

    startApi();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (apiReady && currentUser && authToken) {
      refreshData();
    }
  }, [apiReady, currentUser, authToken]);

  useEffect(() => {
    if (!selectedMachineId && machines.length > 0) {
      setSelectedMachineId(machines[0].id);
    }
  }, [machines, selectedMachineId]);

  useEffect(() => {
    const showSubscription = Keyboard.addListener("keyboardDidShow", () => {
      setKeyboardVisible(true);
    });
    const hideSubscription = Keyboard.addListener("keyboardDidHide", () => {
      setKeyboardVisible(false);
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  const selectedMachine =
    machines.find((item) => item.id === selectedMachineId) || machines[0];

  const title =
    {
      home: "Техзаявки",
      qr: "QR-коды",
      new: "Новая заявка",
      journal: "Журнал",
      details: "Карточка заявки",
      profile: "Профиль",
    }[screen] || "Техзаявки";

  const activeAlerts = useMemo(
    () =>
      requests.filter((item) =>
        ["Высокий", "Критический"].includes(item.priority),
      ).length,
    [requests],
  );

  async function refreshData() {
    if (!authToken || !currentUser) {
      return;
    }

    try {
      const [machineRows, userRows, requestRows] = await Promise.all([
        apiRequest("/machines", { token: authToken }),
        apiRequest("/users", { token: authToken }),
        apiRequest("/requests", { token: authToken }),
      ]);

      setMachines(machineRows.map(mapMachine));
      setAllUsers(userRows.map(mapUser));
      setRequests(requestRows.map(mapRequest));
    } catch (error) {
      Alert.alert("Ошибка PostgreSQL API", getErrorMessage(error));
    }
  }

  async function handleRefresh() {
    setRefreshing(true);
    await refreshData();
    if (selectedRequest) {
      await openRequestByPublicId(selectedRequest.publicId, false);
    }
    setRefreshing(false);
  }

  function scrollToRequestDescription() {
    setTimeout(() => {
      mainScrollRef.current?.scrollToEnd({ animated: true });
    }, Platform.OS === "ios" ? 320 : 120);
  }

  async function handleLogin(login, password) {
    if (!apiReady) {
      return;
    }

    const cleanLogin = login.trim().toLowerCase();
    const cleanPassword = password.trim();

    if (!cleanLogin || !cleanPassword) {
      setAuthError("Введите логин и пароль.");
      return;
    }

    try {
      const session = await apiRequest("/auth/login", {
        auth: false,
        method: "POST",
        body: {
          login: cleanLogin,
          password: cleanPassword,
        },
      });
      const user = mapUser(session.user);
      setAuthError("");
      setAuthToken(session.token);
      setCurrentUser(user);
      setScreen("home");
      setSelectedRequest(null);
      setRequestHistory([]);
    } catch (error) {
      setAuthError(getErrorMessage(error));
    }
  }

  function handleLogout() {
    setAuthToken("");
    setCurrentUser(null);
    setScreen("home");
    setSelectedRequest(null);
    setRequestHistory([]);
    setRequests([]);
  }

  async function createRequest(data) {
    if (!apiReady || !authToken || !currentUser || !selectedMachine) {
      return;
    }

    setSaving(true);
    try {
      const result = await apiRequest("/requests", {
        token: authToken,
        method: "POST",
        body: data,
      });

      await refreshData();
      await openRequestByPublicId(result.publicId);
      Alert.alert("Заявка создана", `Номер ${result.publicId} сохранен в PostgreSQL.`);
    } catch (error) {
      Alert.alert("Не удалось создать заявку", getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  async function updateStatus(publicId, status) {
    if (!apiReady || !authToken || !currentUser || !canChangeStatus(currentUser)) {
      Alert.alert("Недостаточно прав", "Статус может менять ремонтная служба, диспетчер или администратор.");
      return;
    }

    setSaving(true);
    try {
      await apiRequest(`/requests/${encodeURIComponent(publicId)}/status`, {
        token: authToken,
        method: "PATCH",
        body: { status },
      });

      await refreshData();
      await openRequestByPublicId(publicId);
    } catch (error) {
      Alert.alert("Не удалось обновить статус", getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  async function handleQrScanned(rawValue) {
    if (!apiReady || !authToken || !rawValue) {
      return;
    }

    try {
      const match = await apiRequest("/qr/resolve", {
        token: authToken,
        method: "POST",
        body: { value: rawValue },
      });

      if (match?.machineId) {
        setSelectedMachineId(match.machineId);
        setScreen("new");
        return;
      }

      if (canManageQr(currentUser)) {
        Alert.alert(
          "QR не зарегистрирован",
          "Код не найден в базе. Привязать его к выбранному станку?",
          [
            { text: "Отмена", style: "cancel" },
            {
              text: "Привязать",
              onPress: () => saveMachineQr(selectedMachineId, rawValue),
            },
          ],
        );
        return;
      }

      Alert.alert(
        "QR не зарегистрирован",
        "Обратитесь к диспетчеру или администратору, чтобы добавить код в базу.",
      );
    } catch (error) {
      Alert.alert("Ошибка сканирования", getErrorMessage(error));
    }
  }

  async function saveMachineQr(machineId, scannedValue = "") {
    if (!apiReady || !authToken || !currentUser || !canManageQr(currentUser)) {
      Alert.alert("Недостаточно прав", "QR-коды может добавлять диспетчер или администратор.");
      return;
    }

    const machine = machines.find((item) => item.id === machineId);
    if (!machine) {
      Alert.alert("Станок не выбран", "Выберите оборудование для привязки QR-кода.");
      return;
    }

    setSaving(true);
    try {
      await apiRequest(`/machines/${encodeURIComponent(machineId)}/qr`, {
        token: authToken,
        method: "POST",
        body: { scannedValue },
      });

      await refreshData();
      Alert.alert("QR сохранен", `Код привязан к станку ${machine.name}.`);
    } catch (error) {
      Alert.alert(
        "Не удалось сохранить QR",
        "Проверьте, не привязан ли этот код к другому станку. " + getErrorMessage(error),
      );
    } finally {
      setSaving(false);
    }
  }

  async function openRequestByPublicId(publicId, navigate = true) {
    if (!authToken) {
      return;
    }

    try {
      const result = await apiRequest(`/requests/${encodeURIComponent(publicId)}`, {
        token: authToken,
      });
      const row = result.request;

      if (!row) {
        Alert.alert("Заявка не найдена", "Запись отсутствует в PostgreSQL.");
        return;
      }

      setSelectedRequest(mapRequest(row));
      setRequestHistory(result.history.map(mapHistory));
      if (navigate) {
        setScreen("details");
      }
    } catch (error) {
      Alert.alert("Не удалось открыть заявку", getErrorMessage(error));
    }
  }

  async function resetDemoData() {
    if (!apiReady || !authToken || !currentUser || currentUser.role !== "admin") {
      return;
    }

    setSaving(true);
    try {
      await apiRequest("/demo/reset", {
        token: authToken,
        method: "POST",
      });
      await refreshData();
      setScreen("home");
      setSelectedRequest(null);
      setRequestHistory([]);
      Alert.alert("База обновлена", "Демо-данные заново записаны в PostgreSQL.");
    } catch (error) {
      Alert.alert("Не удалось обновить базу", getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  if (boot.loading) {
    return <BootScreen message="Подключаем PostgreSQL API..." />;
  }

  if (boot.error) {
    return <ErrorScreen message={boot.error} />;
  }

  if (!currentUser) {
    return (
      <LoginScreen
        error={authError}
        onLogin={handleLogin}
        demoUsers={demoUsers}
      />
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ExpoStatusBar style="dark" />
      <StatusBar barStyle="dark-content" />
      <View style={styles.app}>
        <Header
          title={title}
          currentUser={currentUser}
          activeAlerts={activeAlerts}
          onLogout={handleLogout}
          onRefresh={handleRefresh}
        />
        <ScrollView
          ref={mainScrollRef}
          contentContainerStyle={styles.content}
          automaticallyAdjustKeyboardInsets={Platform.OS === "ios"}
          keyboardDismissMode="interactive"
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
          showsVerticalScrollIndicator={false}
        >
          {screen === "home" && (
            <HomeScreen
              currentUser={currentUser}
              requests={requests}
              machines={machines}
              setScreen={setScreen}
              setQrMode={setQrMode}
              setSelectedMachineId={setSelectedMachineId}
              openRequest={openRequestByPublicId}
            />
          )}
          {screen === "qr" && selectedMachine && (
            <QrScreen
              machines={machines}
              selectedMachine={selectedMachine}
              currentUser={currentUser}
              mode={qrMode}
              setMode={setQrMode}
              setSelectedMachineId={setSelectedMachineId}
              setScreen={setScreen}
              onScanned={handleQrScanned}
              onSaveQr={saveMachineQr}
              saving={saving}
            />
          )}
          {screen === "new" && selectedMachine && (
            <NewRequestScreen
              machines={machines}
              selectedMachine={selectedMachine}
              selectedMachineId={selectedMachineId}
              setSelectedMachineId={setSelectedMachineId}
              currentUser={currentUser}
              createRequest={createRequest}
              saving={saving}
              onDescriptionFocus={scrollToRequestDescription}
            />
          )}
          {screen === "journal" && (
            <JournalScreen
              requests={requests}
              filter={filter}
              setFilter={setFilter}
              openRequest={openRequestByPublicId}
            />
          )}
          {screen === "details" && selectedRequest && (
            <DetailsScreen
              request={selectedRequest}
              history={requestHistory}
              currentUser={currentUser}
              updateStatus={updateStatus}
              saving={saving}
            />
          )}
          {screen === "profile" && (
            <ProfileScreen
              currentUser={currentUser}
              allUsers={allUsers}
              demoUsers={demoUsers}
              resetDemoData={resetDemoData}
              saving={saving}
            />
          )}
        </ScrollView>
        {!keyboardVisible && <BottomNav screen={screen} setScreen={setScreen} />}
      </View>
    </SafeAreaView>
  );
}

function LoginScreen({ error, onLogin, demoUsers }) {
  const [login, setLogin] = useState("admin");
  const [password, setPassword] = useState("admin123");

  function fillUser(user) {
    setLogin(user.login);
    setPassword(user.password);
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ExpoStatusBar style="dark" />
      <StatusBar barStyle="dark-content" />
      <KeyboardAvoidingView
        style={styles.loginShell}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.loginContent}
          showsVerticalScrollIndicator={false}
        >
          <Image source={images.plant} style={styles.loginImage} />
          <Text style={styles.kicker}>АО СМК</Text>
          <Text style={styles.h1}>Вход в систему техзаявок</Text>
          <Text style={styles.lead}>
            Авторизация выполняется через API, пользователи хранятся в PostgreSQL.
          </Text>

          <Label text="Логин" />
          <TextInput
            style={styles.input}
            value={login}
            onChangeText={setLogin}
            autoCapitalize="none"
            placeholder="Введите логин"
          />

          <Label text="Пароль" />
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholder="Введите пароль"
          />

          {!!error && <Text style={styles.errorText}>{error}</Text>}

          <PrimaryButton
            label="Войти"
            icon="log-in-outline"
            onPress={() => onLogin(login, password)}
          />

          <Text style={styles.sectionTitle}>Демо-доступы</Text>
          {demoUsers.map((user) => (
            <TouchableOpacity
              key={user.login}
              style={styles.userRow}
              onPress={() => fillUser(user)}
            >
              <View style={styles.userAvatar}>
                <Text style={styles.userAvatarText}>{getInitials(user.fullName)}</Text>
              </View>
              <View style={styles.userInfo}>
                <Text style={styles.cardTitle}>{user.fullName}</Text>
                <Text style={styles.cardMeta}>
                  {user.login} / {user.password}
                </Text>
              </View>
              <RolePill role={user.role} />
            </TouchableOpacity>
          ))}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function BootScreen({ message }) {
  return (
    <SafeAreaView style={styles.centerScreen}>
      <ActivityIndicator size="large" color={colors.blueDark} />
      <Text style={styles.centerTitle}>{message}</Text>
      <Text style={styles.centerText}>{API_BASE_URL}</Text>
    </SafeAreaView>
  );
}

function ErrorScreen({ message }) {
  return (
    <SafeAreaView style={styles.centerScreen}>
      <MaterialCommunityIcons name="database-alert" size={42} color={colors.red} />
      <Text style={styles.centerTitle}>PostgreSQL API недоступен</Text>
      <Text style={styles.centerText}>{message}</Text>
      <Text style={styles.centerText}>Проверьте сервер: {API_BASE_URL}</Text>
    </SafeAreaView>
  );
}

function Header({ title, currentUser, activeAlerts, onLogout, onRefresh }) {
  return (
    <View style={styles.header}>
      <TouchableOpacity style={styles.headerIcon} onPress={onRefresh}>
        <MaterialCommunityIcons name="database-sync" size={23} color={colors.blueDark} />
      </TouchableOpacity>
      <View style={styles.headerText}>
        <Text style={styles.headerLabel}>
          {roleConfig[currentUser.role]?.short || currentUser.role} · {currentUser.fullName}
        </Text>
        <Text style={styles.headerTitle}>{title}</Text>
      </View>
      <TouchableOpacity
        style={styles.headerIcon}
        onPress={() =>
          Alert.alert(
            "Уведомления",
            activeAlerts
              ? `Срочных заявок: ${activeAlerts}`
              : "Срочных заявок нет.",
          )
        }
      >
        <Ionicons name="notifications-outline" size={22} color={colors.blueDark} />
      </TouchableOpacity>
      <TouchableOpacity style={styles.headerIcon} onPress={onLogout}>
        <Ionicons name="log-out-outline" size={22} color={colors.blueDark} />
      </TouchableOpacity>
    </View>
  );
}

function HomeScreen({
  currentUser,
  requests,
  machines,
  setScreen,
  setQrMode,
  setSelectedMachineId,
  openRequest,
}) {
  const counters = useMemo(
    () => ({
      total: requests.length,
      new: requests.filter((item) => item.status === "Новая").length,
      active: requests.filter((item) =>
        ["В работе", "Ожидает детали"].includes(item.status),
      ).length,
      urgent: requests.filter((item) =>
        ["Высокий", "Критический"].includes(item.priority),
      ).length,
      machines: machines.length,
    }),
    [requests, machines],
  );

  return (
    <View>
      <Image source={images.plant} style={styles.heroImage} />
      <View style={styles.rowBetween}>
        <Text style={styles.kicker}>Ступинская металлургическая компания</Text>
        <RolePill role={currentUser.role} />
      </View>
      <Text style={styles.h1}>Подача технических заявок по QR-коду</Text>
      <Text style={styles.lead}>
        Данные оборудования, заявок, пользователей и истории статусов хранятся в PostgreSQL.
      </Text>

      <View style={styles.grid}>
        <StatCard label="Всего" value={counters.total} icon="clipboard-list-outline" color={colors.blue} />
        <StatCard label="Новые" value={counters.new} icon="alert-circle-outline" color={colors.amber} />
        <StatCard label="В работе" value={counters.active} icon="progress-wrench" color={colors.green} />
        <StatCard label="Срочные" value={counters.urgent} icon="fire-alert" color={colors.red} />
      </View>

      <InfoPanel
        title="Текущий доступ"
        lines={[
          roleConfig[currentUser.role]?.scope || "Роль не определена",
          `Оборудование в базе: ${counters.machines}`,
        ]}
      />

      <View style={styles.actions}>
        <PrimaryButton
          label="Создать заявку"
          icon="add-circle-outline"
          onPress={() => setScreen("new")}
        />
        <SecondaryButton
          label="Сканировать QR"
          icon="qr-code-outline"
          onPress={() => {
            setQrMode("scan");
            setScreen("qr");
          }}
        />
      </View>

      <Text style={styles.sectionTitle}>Последние обращения</Text>
      {requests.length === 0 ? (
        <EmptyState title="Заявок нет" text="Для этой роли пока нет доступных записей." />
      ) : (
        requests.slice(0, 4).map((request) => (
          <RequestCard
            key={request.publicId}
            request={request}
            onPress={() => {
              setSelectedMachineId(request.machineId);
              openRequest(request.publicId);
            }}
          />
        ))
      )}
    </View>
  );
}

function QrScreen({
  machines,
  selectedMachine,
  currentUser,
  mode,
  setMode,
  setSelectedMachineId,
  setScreen,
  onScanned,
  onSaveQr,
  saving,
}) {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanLocked, setScanLocked] = useState(false);
  const [lastScan, setLastScan] = useState("");
  const qrValue = selectedMachine.qrPayload || buildLegacyMachinePayload(selectedMachine.id);
  const canManage = canManageQr(currentUser);

  function handleBarcodeScanned(result) {
    if (scanLocked) {
      return;
    }

    const data = result?.data || "";
    setScanLocked(true);
    setLastScan(data);
    Promise.resolve(onScanned(data)).finally(() => {
      setTimeout(() => setScanLocked(false), 1200);
    });
  }

  return (
    <View>
      <Image source={selectedMachine.image} style={styles.machineImage} />
      <Text style={styles.kicker}>QR-код оборудования</Text>
      <Text style={styles.h1}>{selectedMachine.name}</Text>
      <Text style={styles.lead}>
        {selectedMachine.area}. {selectedMachine.line}. Код хранится в PostgreSQL.
      </Text>

      <Segmented
        options={["code", "scan"]}
        value={mode}
        getLabel={(item) => (item === "code" ? "QR-код" : "Сканер")}
        onChange={setMode}
      />

      {mode === "code" ? (
        <View style={styles.qrBox}>
          <QRCode value={qrValue} size={190} backgroundColor="#ffffff" color={colors.text} />
          <Text style={styles.qrCodeText}>{selectedMachine.id}</Text>
          <Text style={styles.qrValueText}>{selectedMachine.qrValue || "legacy-machine-id"}</Text>
        </View>
      ) : (
        <View style={styles.scannerBox}>
          {!permission ? (
            <ActivityIndicator size="large" color={colors.blueDark} />
          ) : !permission.granted ? (
            <>
              <MaterialCommunityIcons name="camera-off-outline" size={38} color={colors.muted} />
              <Text style={styles.emptyTitle}>Нужен доступ к камере</Text>
              <Text style={styles.emptyText}>
                Разрешите камеру, чтобы сканировать QR-коды на станках.
              </Text>
              <PrimaryButton
                label="Разрешить камеру"
                icon="camera-outline"
                onPress={requestPermission}
              />
            </>
          ) : (
            <>
              <CameraView
                style={styles.cameraView}
                facing="back"
                barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
                onBarcodeScanned={scanLocked ? undefined : handleBarcodeScanned}
              >
                <View style={styles.scanFrame} />
              </CameraView>
              <Text style={styles.scanHint}>
                Наведите камеру на QR-код станка. После распознавания откроется новая заявка.
              </Text>
              {!!lastScan && <Text style={styles.lastScanText}>Последний код: {lastScan}</Text>}
            </>
          )}
        </View>
      )}

      {canManage && (
        <View>
          <InfoPanel
            title="Управление QR"
            lines={[
              `Текущий QR: ${selectedMachine.qrValue || "не создан"}`,
              `Обновлен: ${formatDate(selectedMachine.qrUpdatedAt)}`,
              "Добавлять и заменять QR может диспетчер или администратор.",
            ]}
          />
          <SecondaryButton
            label={saving ? "Сохраняем..." : "Сгенерировать новый QR"}
            icon="refresh-outline"
            disabled={saving}
            onPress={() => onSaveQr(selectedMachine.id)}
          />
        </View>
      )}

      <Text style={styles.sectionTitle}>Выбор станка</Text>
      {machines.map((machine) => (
        <TouchableOpacity
          key={machine.id}
          style={[styles.machineRow, selectedMachine.id === machine.id && styles.machineRowActive]}
          onPress={() => setSelectedMachineId(machine.id)}
        >
          <View style={styles.flexOne}>
            <Text style={styles.cardTitle}>{machine.name}</Text>
            <Text style={styles.cardMeta}>{machine.area}</Text>
          </View>
          <MachineStatus status={machine.status} />
        </TouchableOpacity>
      ))}

      <PrimaryButton
        label="Заявка по этому станку"
        icon="create-outline"
        onPress={() => setScreen("new")}
      />
    </View>
  );
}

function NewRequestScreen({
  machines,
  selectedMachine,
  selectedMachineId,
  setSelectedMachineId,
  currentUser,
  createRequest,
  saving,
  onDescriptionFocus,
}) {
  const [problemType, setProblemType] = useState(problemTypes[0]);
  const [priority, setPriority] = useState(priorities[1]);
  const [description, setDescription] = useState("");

  function submit() {
    Keyboard.dismiss();
    const cleanDescription = description.trim();

    if (cleanDescription.length < 8) {
      Alert.alert(
        "Добавьте описание",
        "Кратко опишите, что произошло с оборудованием.",
      );
      return;
    }

    createRequest({
      machineId: selectedMachineId,
      problemType,
      priority,
      description: cleanDescription,
    });
  }

  return (
    <View>
      <Text style={styles.kicker}>Форма обращения</Text>
      <Text style={styles.h1}>Сообщить о проблеме</Text>
      <Text style={styles.lead}>
        Заявитель: {currentUser.fullName}. Ответственный подставляется из карточки оборудования.
      </Text>

      <Label text="Оборудование" />
      <Segmented
        options={machines.map((item) => item.id)}
        value={selectedMachineId}
        getLabel={(id) => machines.find((item) => item.id === id)?.name || id}
        onChange={setSelectedMachineId}
      />

      <InfoPanel
        title={selectedMachine.name}
        lines={[
          selectedMachine.area,
          selectedMachine.line,
          `Ответственный: ${selectedMachine.responsible}`,
        ]}
      />

      <Label text="Тип проблемы" />
      <Segmented options={problemTypes} value={problemType} onChange={setProblemType} />

      <Label text="Приоритет" />
      <Segmented options={priorities} value={priority} onChange={setPriority} />

      <Label text="Описание неисправности" />
      <TextInput
        style={[styles.input, styles.textarea]}
        value={description}
        onChangeText={setDescription}
        onFocus={onDescriptionFocus}
        multiline
        placeholder="Например: станок не запускается, слышен стук, перегрев, ошибка ЧПУ"
      />

      <PrimaryButton
        label={saving ? "Сохраняем..." : "Отправить заявку"}
        icon="send-outline"
        disabled={saving}
        onPress={submit}
      />
    </View>
  );
}

function JournalScreen({ requests, filter, setFilter, openRequest }) {
  const [search, setSearch] = useState("");

  const visibleRequests = useMemo(() => {
    const query = search.trim().toLowerCase();
    return requests.filter((request) => {
      const statusMatch = filter === "Все" || request.status === filter;
      const queryMatch =
        !query ||
        [
          request.publicId,
          request.machineName,
          request.area,
          request.problemType,
          request.priority,
          request.description,
          request.reporter,
          request.assignee,
        ]
          .join(" ")
          .toLowerCase()
          .includes(query);

      return statusMatch && queryMatch;
    });
  }, [requests, filter, search]);

  return (
    <View>
      <Text style={styles.kicker}>Журнал обращений</Text>
      <Text style={styles.h1}>Контроль ремонта</Text>
      <Text style={styles.lead}>
        Журнал показывает записи, доступные текущей роли пользователя.
      </Text>

      <TextInput
        style={styles.input}
        value={search}
        onChangeText={setSearch}
        placeholder="Поиск по номеру, станку, цеху или описанию"
      />

      <Segmented options={["Все", ...statuses]} value={filter} onChange={setFilter} />

      {visibleRequests.length === 0 ? (
        <EmptyState title="Ничего не найдено" text="Измените фильтр или строку поиска." />
      ) : (
        visibleRequests.map((request) => (
          <RequestCard
            key={request.publicId}
            request={request}
            onPress={() => openRequest(request.publicId)}
          />
        ))
      )}
    </View>
  );
}

function DetailsScreen({ request, history, currentUser, updateStatus, saving }) {
  const statusAllowed = canChangeStatus(currentUser);

  return (
    <View>
      <Image source={request.image} style={styles.machineImage} />
      <View style={styles.rowBetween}>
        <Text style={styles.kicker}>{request.publicId}</Text>
        <StatusPill status={request.status} />
      </View>
      <Text style={styles.h1}>{request.machineName}</Text>
      <Text style={styles.lead}>{request.description}</Text>

      <InfoPanel
        title="Параметры заявки"
        lines={[
          `Цех: ${request.area}`,
          `Тип: ${request.problemType}`,
          `Приоритет: ${request.priority}`,
          `Заявитель: ${request.reporter}`,
          `Ответственный: ${request.assignee}`,
          `Создана: ${formatDate(request.createdAt)}`,
          `Обновлена: ${formatDate(request.updatedAt)}`,
        ]}
      />

      <Label text="Статус работ" />
      {statusAllowed ? (
        <Segmented
          options={statuses}
          value={request.status}
          onChange={(status) => updateStatus(request.publicId, status)}
          disabled={saving}
        />
      ) : (
        <InfoPanel
          title="Просмотр без изменения"
          lines={["Эта роль может создавать и просматривать заявки, но не меняет статус работ."]}
        />
      )}

      <Text style={styles.sectionTitle}>История</Text>
      {history.map((item) => (
        <View style={styles.timelineItem} key={item.id}>
          <View style={styles.timelineDot} />
          <View style={styles.flexOne}>
            <Text style={styles.cardTitle}>{item.status}</Text>
            <Text style={styles.cardMeta}>
              {formatDate(item.changedAt)} · {item.changedBy}
            </Text>
            <Text style={styles.cardText}>{item.comment}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

function ProfileScreen({ currentUser, allUsers, demoUsers, resetDemoData, saving }) {
  const role = roleConfig[currentUser.role] || roleConfig.operator;
  const canSeeUsers = currentUser.role === "admin";

  return (
    <View>
      <Image source={images.shop} style={styles.machineImage} />
      <Text style={styles.kicker}>Профиль</Text>
      <Text style={styles.h1}>{currentUser.fullName}</Text>
      <Text style={styles.lead}>
        {currentUser.position}. {currentUser.department}
      </Text>

      <InfoPanel
        title="Роль и доступ"
        lines={[
          `Роль: ${role.label}`,
          `Область данных: ${role.scope}`,
          `Логин: ${currentUser.login}`,
          `Телефон: ${currentUser.phone}`,
          `API: ${API_BASE_URL}`,
          "База данных: PostgreSQL",
        ]}
      />

      {canSeeUsers && (
        <>
          <Text style={styles.sectionTitle}>Пользователи БД</Text>
          {allUsers.map((user) => (
            <View key={user.id} style={styles.userRow}>
              <View style={styles.userAvatar}>
                <Text style={styles.userAvatarText}>{getInitials(user.fullName)}</Text>
              </View>
              <View style={styles.userInfo}>
                <Text style={styles.cardTitle}>{user.fullName}</Text>
                <Text style={styles.cardMeta}>{user.login} · {user.position}</Text>
              </View>
              <RolePill role={user.role} />
            </View>
          ))}

          <Text style={styles.sectionTitle}>Логины для демонстрации</Text>
          {demoUsers.map((user) => (
            <InfoPanel
              key={user.login}
              title={`${user.login} / ${user.password}`}
              lines={[`${user.fullName}, ${roleConfig[user.role]?.label}`]}
            />
          ))}

          <SecondaryButton
            label={saving ? "Обновляем..." : "Пересоздать демо-БД"}
            icon="refresh-outline"
            disabled={saving}
            onPress={resetDemoData}
          />
        </>
      )}
    </View>
  );
}

function RequestCard({ request, onPress }) {
  return (
    <TouchableOpacity style={styles.requestCard} onPress={onPress}>
      <View style={styles.requestTop}>
        <Text style={styles.requestId}>{request.publicId}</Text>
        <StatusPill status={request.status} />
      </View>
      <Text style={styles.cardTitle}>{request.machineName}</Text>
      <Text style={styles.cardMeta}>
        {request.problemType} · {request.priority} · {formatDate(request.createdAt)}
      </Text>
      <Text style={styles.cardText}>{request.description}</Text>
      <View style={styles.requestFooter}>
        <Text style={styles.footerText}>Заявитель: {request.reporter}</Text>
        <Text style={styles.footerText}>Ответственный: {request.assignee}</Text>
      </View>
    </TouchableOpacity>
  );
}

function StatCard({ label, value, icon, color }) {
  return (
    <View style={styles.statCard}>
      <MaterialCommunityIcons name={icon} size={24} color={color} />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function StatusPill({ status }) {
  const color =
    status === "Новая"
      ? colors.amber
      : status === "Выполнена"
        ? colors.green
        : status === "Ожидает детали"
          ? colors.red
          : colors.blue;

  return (
    <View style={[styles.pill, { borderColor: color }]}>
      <Text style={[styles.pillText, { color }]}>{status}</Text>
    </View>
  );
}

function RolePill({ role }) {
  const item = roleConfig[role] || roleConfig.operator;

  return (
    <View style={[styles.rolePill, { borderColor: item.color }]}>
      <Text style={[styles.roleText, { color: item.color }]}>{item.short}</Text>
    </View>
  );
}

function MachineStatus({ status }) {
  const color = status === "Работает" ? colors.green : colors.amber;

  return (
    <View style={[styles.machineStatus, { backgroundColor: `${color}1A` }]}>
      <Text style={[styles.machineStatusText, { color }]}>{status}</Text>
    </View>
  );
}

function Label({ text }) {
  return <Text style={styles.label}>{text}</Text>;
}

function InfoPanel({ title, lines }) {
  return (
    <View style={styles.infoPanel}>
      <Text style={styles.cardTitle}>{title}</Text>
      {lines.map((line) => (
        <Text key={line} style={styles.infoLine}>{line}</Text>
      ))}
    </View>
  );
}

function EmptyState({ title, text }) {
  return (
    <View style={styles.emptyState}>
      <MaterialCommunityIcons name="clipboard-text-search-outline" size={34} color={colors.muted} />
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyText}>{text}</Text>
    </View>
  );
}

function Segmented({
  options,
  value,
  onChange,
  getLabel = (item) => item,
  disabled = false,
}) {
  return (
    <View style={styles.segmentWrap}>
      {options.map((option) => {
        const active = option === value;
        return (
          <TouchableOpacity
            key={option}
            style={[styles.segment, active && styles.segmentActive, disabled && styles.disabled]}
            disabled={disabled}
            onPress={() => onChange(option)}
          >
            <Text style={[styles.segmentText, active && styles.segmentTextActive]}>
              {getLabel(option)}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function PrimaryButton({ label, icon, onPress, disabled = false }) {
  return (
    <TouchableOpacity
      style={[styles.primaryButton, disabled && styles.disabled]}
      disabled={disabled}
      onPress={onPress}
    >
      <Ionicons name={icon} size={20} color="#ffffff" />
      <Text style={styles.primaryText}>{label}</Text>
    </TouchableOpacity>
  );
}

function SecondaryButton({ label, icon, onPress, disabled = false }) {
  return (
    <TouchableOpacity
      style={[styles.secondaryButton, disabled && styles.disabled]}
      disabled={disabled}
      onPress={onPress}
    >
      <Ionicons name={icon} size={20} color={colors.blueDark} />
      <Text style={styles.secondaryText}>{label}</Text>
    </TouchableOpacity>
  );
}

function BottomNav({ screen, setScreen }) {
  const items = [
    ["home", "Главная", "home-outline"],
    ["qr", "QR", "qr-code-outline"],
    ["new", "Заявка", "add-circle-outline"],
    ["journal", "Журнал", "list-outline"],
    ["profile", "Профиль", "person-outline"],
  ];

  return (
    <View style={styles.nav}>
      {items.map(([key, label, icon]) => {
        const active = screen === key;
        return (
          <TouchableOpacity key={key} style={styles.navItem} onPress={() => setScreen(key)}>
            <Ionicons name={icon} size={21} color={active ? colors.blueDark : colors.muted} />
            <Text style={[styles.navText, active && styles.navTextActive]}>{label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

async function apiRequest(path, { method = "GET", body, token, auth = true, timeoutMs = 9000 } = {}) {
  const headers = {
    Accept: "application/json",
  };

  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  if (auth && token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${API_BASE_URL}/api${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
    const text = await response.text();
    let data = null;

    if (text) {
      try {
        data = JSON.parse(text);
      } catch {
        data = { error: text };
      }
    }

    if (!response.ok) {
      throw new Error(data?.error || `HTTP ${response.status}`);
    }

    return data;
  } catch (error) {
    if (error?.name === "AbortError") {
      throw new Error(`API не ответил за ${Math.round(timeoutMs / 1000)} сек. Проверьте, что сервер запущен и порт 6666 открыт.`);
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

function mapUser(row) {
  return {
    id: row.id,
    login: row.login,
    fullName: row.full_name,
    role: row.role,
    position: row.position,
    department: row.department,
    phone: row.phone,
    isActive: Boolean(row.is_active),
  };
}

function mapMachine(row) {
  return {
    id: row.id,
    name: row.name,
    area: row.area,
    line: row.line,
    responsible: row.responsible,
    responsibleUserId: row.responsible_user_id,
    status: row.status,
    imageKey: row.image_key,
    qrValue: row.qr_value,
    qrPayload: row.qr_payload,
    qrUpdatedAt: row.qr_updated_at,
    image: images[row.image_key] || images.machine,
  };
}

function mapRequest(row) {
  return {
    id: row.id,
    publicId: row.public_id,
    machineId: row.machine_id,
    machineName: row.machine_name,
    area: row.area,
    line: row.line,
    image: images[row.image_key] || images.machine,
    problemType: row.problem_type,
    priority: row.priority,
    description: row.description,
    reporterUserId: row.reporter_user_id,
    reporter: row.reporter_display || row.reporter_name,
    assigneeUserId: row.assignee_user_id,
    assignee: row.assignee_display || row.assignee_name,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    closedAt: row.closed_at,
  };
}

function mapHistory(row) {
  return {
    id: row.id,
    status: row.status,
    comment: row.comment,
    changedBy: row.changed_by_name || "Система",
    changedAt: row.changed_at,
  };
}

function canChangeStatus(user) {
  return ["admin", "dispatcher", "technician"].includes(user.role);
}

function canManageQr(user) {
  return ["admin", "dispatcher"].includes(user?.role);
}

function buildLegacyMachinePayload(machineId) {
  return `${QR_BASE_URL}?machineId=${encodeURIComponent(machineId)}`;
}

function formatDate(value) {
  if (!value) {
    return "не указано";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getInitials(name) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function getErrorMessage(error) {
  return error?.message || String(error);
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  app: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  loginShell: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  loginContent: {
    padding: 18,
    paddingBottom: 40,
  },
  loginImage: {
    width: "100%",
    height: 175,
    borderRadius: 8,
    marginBottom: 18,
  },
  centerScreen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 28,
    backgroundColor: colors.bg,
  },
  centerTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: "900",
    marginTop: 14,
    textAlign: "center",
  },
  centerText: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 21,
    marginTop: 8,
    textAlign: "center",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 12,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  headerIcon: {
    width: 42,
    height: 42,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#e8f1f7",
  },
  headerText: {
    flex: 1,
    minWidth: 0,
  },
  headerLabel: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "700",
  },
  headerTitle: {
    color: colors.text,
    fontSize: 21,
    fontWeight: "900",
  },
  content: {
    padding: 18,
    paddingBottom: 96,
  },
  heroImage: {
    width: "100%",
    height: 170,
    borderRadius: 8,
    marginBottom: 18,
  },
  machineImage: {
    width: "100%",
    height: 145,
    borderRadius: 8,
    marginBottom: 18,
  },
  rowBetween: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  kicker: {
    color: colors.blueDark,
    fontSize: 12,
    fontWeight: "900",
    textTransform: "uppercase",
    marginBottom: 6,
    flexShrink: 1,
  },
  h1: {
    color: colors.text,
    fontSize: 28,
    lineHeight: 34,
    fontWeight: "900",
    marginBottom: 10,
  },
  lead: {
    color: colors.muted,
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 18,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 16,
  },
  statCard: {
    width: "48.5%",
    minHeight: 104,
    borderRadius: 8,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 14,
  },
  statValue: {
    color: colors.text,
    fontSize: 27,
    fontWeight: "900",
    marginTop: 8,
  },
  statLabel: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: "700",
  },
  actions: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 20,
  },
  primaryButton: {
    minHeight: 50,
    borderRadius: 8,
    backgroundColor: colors.blueDark,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 14,
    marginTop: 8,
    flex: 1,
  },
  primaryText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "900",
  },
  secondaryButton: {
    minHeight: 50,
    borderRadius: 8,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 14,
    marginTop: 8,
    flex: 1,
  },
  secondaryText: {
    color: colors.blueDark,
    fontSize: 15,
    fontWeight: "900",
  },
  disabled: {
    opacity: 0.55,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "900",
    marginTop: 10,
    marginBottom: 10,
  },
  requestCard: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 14,
    marginBottom: 10,
  },
  requestTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    marginBottom: 8,
  },
  requestId: {
    color: colors.blueDark,
    fontSize: 13,
    fontWeight: "900",
  },
  requestFooter: {
    borderTopWidth: 1,
    borderTopColor: colors.line,
    marginTop: 12,
    paddingTop: 10,
    gap: 3,
  },
  footerText: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "700",
  },
  cardTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "900",
    marginBottom: 4,
  },
  cardMeta: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 19,
  },
  cardText: {
    color: colors.text,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 8,
  },
  pill: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  pillText: {
    fontSize: 12,
    fontWeight: "900",
  },
  rolePill: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 5,
    backgroundColor: colors.surface,
  },
  roleText: {
    fontSize: 12,
    fontWeight: "900",
  },
  qrBox: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 22,
    marginBottom: 18,
  },
  qrCodeText: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "900",
    marginTop: 12,
  },
  qrValueText: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 6,
    textAlign: "center",
  },
  scannerBox: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.line,
    minHeight: 320,
    padding: 14,
    marginBottom: 18,
    overflow: "hidden",
  },
  cameraView: {
    width: "100%",
    height: 280,
    borderRadius: 8,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  scanFrame: {
    width: 210,
    height: 210,
    borderRadius: 8,
    borderWidth: 3,
    borderColor: "#ffffff",
    backgroundColor: "transparent",
  },
  scanHint: {
    color: colors.text,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "800",
    marginTop: 12,
    textAlign: "center",
  },
  lastScanText: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 8,
    textAlign: "center",
  },
  machineRow: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 14,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  machineRowActive: {
    borderColor: colors.blueDark,
    backgroundColor: "#eaf3f8",
  },
  machineStatus: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  machineStatusText: {
    fontSize: 12,
    fontWeight: "900",
  },
  flexOne: {
    flex: 1,
    minWidth: 0,
  },
  label: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "900",
    marginTop: 12,
    marginBottom: 8,
  },
  segmentWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 8,
  },
  segment: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    paddingHorizontal: 11,
    paddingVertical: 9,
  },
  segmentActive: {
    borderColor: colors.blueDark,
    backgroundColor: colors.blueDark,
  },
  segmentText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "800",
  },
  segmentTextActive: {
    color: "#ffffff",
  },
  input: {
    minHeight: 48,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    paddingHorizontal: 12,
    color: colors.text,
    fontSize: 15,
    marginBottom: 8,
  },
  textarea: {
    minHeight: 132,
    paddingVertical: 12,
    textAlignVertical: "top",
  },
  errorText: {
    color: colors.red,
    fontSize: 13,
    fontWeight: "800",
    marginTop: 2,
    marginBottom: 6,
  },
  infoPanel: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 14,
    marginBottom: 10,
  },
  infoLine: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 21,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 145,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 8,
    padding: 18,
  },
  emptyTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: "900",
    marginTop: 10,
  },
  emptyText: {
    color: colors.muted,
    fontSize: 14,
    textAlign: "center",
    marginTop: 6,
  },
  userRow: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 12,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  userAvatar: {
    width: 42,
    height: 42,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surfaceSoft,
  },
  userAvatarText: {
    color: colors.blueDark,
    fontSize: 14,
    fontWeight: "900",
  },
  userInfo: {
    flex: 1,
    minWidth: 0,
  },
  timelineItem: {
    flexDirection: "row",
    gap: 10,
    backgroundColor: colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 14,
    marginBottom: 10,
  },
  timelineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.blueDark,
    marginTop: 5,
  },
  nav: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    minHeight: 74,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingBottom: 8,
  },
  navItem: {
    alignItems: "center",
    justifyContent: "center",
    width: "20%",
    gap: 3,
  },
  navText: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: "800",
  },
  navTextActive: {
    color: colors.blueDark,
  },
});
