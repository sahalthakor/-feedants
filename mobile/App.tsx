import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import * as DocumentPicker from "expo-document-picker";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState, type ComponentProps } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { createTRPCProxyClient, httpBatchLink } from "@trpc/client";
import superjson from "superjson";

type IconName = ComponentProps<typeof Ionicons>["name"];
type TabKey = "about" | "judging" | "rules";

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "https://3000-ipnc4hk78w0l6vlu0l1by-f3909e62.sg2.manus.computer";
const SLUG = "feedants-classical-dance";
const PARTICIPANT_KEY = "native-preview-participant-001";

const api = createTRPCProxyClient<any>({
  links: [httpBatchLink({ url: `${API_URL}/api/trpc`, transformer: superjson })],
}) as any;

const palette = {
  ink: "#17354b",
  muted: "#718092",
  teal: "#087f7b",
  tealSoft: "#e7f6f3",
  border: "#e5ebea",
  background: "#fcfaf6",
  surface: "#ffffff",
  gold: "#c68b12",
};

function Icon({ name, size = 18, color = palette.teal }: { name: IconName; size?: number; color?: string }) {
  return <Ionicons name={name} size={size} color={color} />;
}

function formatDate(timestamp: number) {
  return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "2-digit" }).format(timestamp);
}

function formatTime(timestamp: number) {
  return new Intl.DateTimeFormat("en-IN", { hour: "2-digit", minute: "2-digit" }).format(timestamp);
}

function currency(value: number) {
  return `₹${value.toLocaleString("en-IN")}`;
}

function countdown(target: number) {
  const seconds = Math.max(0, Math.floor((target - Date.now()) / 1000));
  return {
    days: String(Math.floor(seconds / 86400)).padStart(2, "0"),
    hours: String(Math.floor((seconds % 86400) / 3600)).padStart(2, "0"),
    minutes: String(Math.floor((seconds % 3600) / 60)).padStart(2, "0"),
    seconds: String(seconds % 60).padStart(2, "0"),
  };
}

function Card({ children, style }: { children: React.ReactNode; style?: object }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

function SectionTitle({ title, action }: { title: string; action?: string }) {
  return (
    <View style={styles.sectionTitleRow}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {action ? <Text style={styles.sectionAction}>{action}</Text> : null}
    </View>
  );
}

export default function App() {
  const [competition, setCompetition] = useState<any>(null);
  const [viewer, setViewer] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [tab, setTab] = useState<TabKey>("about");
  const [timer, setTimer] = useState({ days: "00", hours: "00", minutes: "00", seconds: "00" });
  const [registering, setRegistering] = useState(false);
  const [uploading, setUploading] = useState(false);

  const showMessage = (text: string) => {
    setMessage(text);
    setTimeout(() => setMessage(""), 2600);
  };

  const loadCompetition = async () => {
    try {
      setLoading(true);
      const result = await api.competition.getBySlug.query({ slug: SLUG, participantKey: PARTICIPANT_KEY });
      setCompetition(result.competition);
      setViewer(result.viewer);
    } catch (error) {
      showMessage(error instanceof Error ? error.message : "Competition could not be loaded");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadCompetition();
  }, []);

  useEffect(() => {
    if (!competition?.registrationDeadline) return;
    setTimer(countdown(competition.registrationDeadline));
    const interval = setInterval(() => setTimer(countdown(competition.registrationDeadline)), 1000);
    return () => clearInterval(interval);
  }, [competition?.registrationDeadline]);

  const register = async () => {
    if (viewer?.isRegistered) {
      showMessage("Your slot is already secured");
      return;
    }
    try {
      setRegistering(true);
      await api.competition.register.mutate({ slug: SLUG, participantKey: PARTICIPANT_KEY });
      showMessage("Registration confirmed");
      await loadCompetition();
    } catch (error) {
      showMessage(error instanceof Error ? error.message : "Registration failed");
    } finally {
      setRegistering(false);
    }
  };

  const pickSubmission = async () => {
    if (!viewer?.isRegistered) {
      showMessage("Register before uploading a submission");
      return;
    }
    try {
      const picked = await DocumentPicker.getDocumentAsync({ type: "video/*", copyToCacheDirectory: false });
      if (picked.canceled) return;
      setUploading(true);
      await api.competition.submit.mutate({
        slug: SLUG,
        participantKey: PARTICIPANT_KEY,
        fileName: picked.assets[0].name,
      });
      showMessage("Submission saved");
      await loadCompetition();
    } catch (error) {
      showMessage(error instanceof Error ? error.message : "Submission is not available yet");
    } finally {
      setUploading(false);
    }
  };

  const copyReferral = async () => {
    await Clipboard.setStringAsync("https://feedants.com/r/referral123");
    showMessage("Referral link copied");
  };

  if (loading) {
    return <View style={styles.loading}><ActivityIndicator size="large" color={palette.teal} /><Text style={styles.loadingText}>Preparing competition details…</Text></View>;
  }

  if (!competition) {
    return <View style={styles.loading}><Icon name="alert-circle-outline" size={42} color="#c46b5b" /><Text style={styles.errorTitle}>Competition unavailable</Text><Pressable style={styles.primaryButton} onPress={loadCompetition}><Text style={styles.primaryText}>Try again</Text></Pressable></View>;
  }

  const tabCopy: Record<TabKey, string> = { about: competition.about, judging: competition.judgingParameters, rules: competition.rules };
  const dates = [
    { label: "Register Before", timestamp: competition.registrationDeadline, icon: "calendar-outline" as IconName },
    { label: "Submission Starts", timestamp: competition.submissionStartsAt, icon: "paper-plane-outline" as IconName },
    { label: "Submission Ends", timestamp: competition.submissionEndsAt, icon: "cloud-upload-outline" as IconName },
    { label: "Result Date", timestamp: competition.resultDate, icon: "trophy-outline" as IconName },
  ];

  return (
    <View style={styles.screen}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Pressable style={styles.backButton} onPress={() => showMessage("Back to competitions")}><Icon name="arrow-back" size={18} color={palette.ink} /><Text style={styles.backText}>Go back</Text></Pressable>
          <View style={styles.language}><Text style={styles.languageActive}>ENG</Text><Text style={styles.languageMuted}>हिंदी</Text></View>
        </View>

        <Card style={styles.heroCard}>
          <View style={styles.titleLine}><View style={styles.titleCopy}><Text style={styles.h1}>{competition.title}</Text><View style={styles.tagLine}><Text style={styles.tag}>{competition.category}</Text><Text style={styles.tag}>{competition.format}</Text><Text style={styles.certificate}><Icon name="ribbon-outline" size={13} /> Winners get certificate</Text></View></View><View style={viewer?.isRegistered ? styles.statusPill : styles.availablePill}><Icon name={viewer?.isRegistered ? "checkmark-circle" : "sparkles-outline"} size={14} color={viewer?.isRegistered ? palette.teal : palette.gold} /><Text style={viewer?.isRegistered ? styles.statusText : styles.availableText}>{viewer?.isRegistered ? "Registered" : "Available"}</Text></View></View>
          <View style={styles.heroStats}><View style={styles.metric}><Text style={styles.metricLabel}>Prize Pool</Text><Text style={styles.metricValue}>{currency(competition.prizePool)}</Text><Text style={styles.metricNote}>Across 6 winning positions</Text></View><View style={styles.metric}><Text style={styles.metricLabel}>Entry Fee</Text><Text style={[styles.metricValue, styles.darkMetric]}>{currency(competition.entryFee)}</Text><Text style={styles.metricNote}>One-time participation fee</Text></View><View style={styles.spots}><Text style={styles.spotsLabel}><Icon name="people-outline" size={15} /> Only {competition.spotsLeft} spots left</Text><Text style={styles.metricNote}>{competition.booked} / {competition.capacity} Booked</Text><View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${Math.min(100, (competition.booked / competition.capacity) * 100)}%` }]} /></View></View></View>
        </Card>

        <Card style={styles.judgeCard}><Image source={{ uri: competition.judge.image }} style={styles.judgeImage} /><View style={styles.judgeCopy}><Text style={styles.eyebrow}>JUDGE</Text><Text style={styles.judgeName}>{competition.judge.name}</Text><Text style={styles.judgeInfo}>{competition.judge.role}</Text><Text style={styles.judgeInfo}>{competition.judge.experience}</Text></View><Pressable style={styles.videoAction} onPress={() => showMessage("Judge intro video ready")}><View style={styles.playCircle}><Icon name="play" size={19} color="white" /></View><Text style={styles.videoLabel}>Intro Video</Text></Pressable></Card>

        <View style={styles.countdown}><View style={styles.countdownLabel}><Icon name="hourglass-outline" size={20} /><Text style={styles.countdownTitle}>Registration closes in</Text></View><View style={styles.countdownValues}><Text style={styles.countdownValue}>{timer.days}<Text style={styles.countdownUnit}>d</Text></Text><Text style={styles.colon}>:</Text><Text style={styles.countdownValue}>{timer.hours}<Text style={styles.countdownUnit}>h</Text></Text><Text style={styles.colon}>:</Text><Text style={styles.countdownValue}>{timer.minutes}<Text style={styles.countdownUnit}>m</Text></Text><Text style={styles.colon}>:</Text><Text style={styles.countdownValue}>{timer.seconds}<Text style={styles.countdownUnit}>s</Text></Text></View><Pressable onPress={register}><Text style={styles.hurry}><Icon name="alarm-outline" size={15} /> Hurry up!</Text></Pressable></View>

        <Card><SectionTitle title="Important Dates" /><View style={styles.datesGrid}>{dates.map((date) => <View style={styles.dateItem} key={date.label}><View style={styles.dateIcon}><Icon name={date.icon} size={19} /></View><View><Text style={styles.dateLabel}>{date.label}</Text><Text style={[styles.dateValue, date.label.includes("Register") || date.label.includes("Ends") ? styles.tealText : null]}>{formatDate(date.timestamp)}</Text><Text style={styles.dateTime}>{formatTime(date.timestamp)}</Text></View></View>)}</View></Card>

        <Card><SectionTitle title="Previous Winners" action="View all" /><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.winnersRow}>{competition.winners.map((winner: any) => <Pressable key={winner.name} style={styles.winnerCard} onPress={() => showMessage(`${winner.name} performance preview`)}><View><Image source={{ uri: winner.image }} style={styles.winnerImage} /><View style={styles.winnerPlay}><Icon name="play" size={11} color="white" /></View></View><Text numberOfLines={1} style={styles.winnerName}>{winner.name}</Text><Text style={styles.winnerPlace}>{winner.place}</Text></Pressable>)}</ScrollView></Card>

        <Card style={styles.aboutCard}><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs}>{([["about", "About Competition"], ["judging", "Judging Parameters"], ["rules", "Rules & Eligibility"]] as [TabKey, string][]).map(([key, label]) => <Pressable key={key} onPress={() => setTab(key)} style={[styles.tab, tab === key && styles.tabActive]}><Text style={[styles.tabText, tab === key && styles.tabTextActive]}>{label}</Text></Pressable>)}</ScrollView><Text style={styles.aboutText}>{tabCopy[tab]}</Text><Pressable onPress={() => showMessage(tabCopy[tab])}><Text style={styles.moreText}>View more <Icon name="chevron-down" size={14} /></Text></Pressable></Card>

        <Card><SectionTitle title="Rewards" action="(All Positions)" />{competition.rewards.map((reward: any, index: number) => <View style={styles.rewardRow} key={reward.label}><View style={[styles.rewardIcon, index === 0 && styles.goldIcon]}><Icon name={reward.icon === "trophy" ? "trophy-outline" : reward.icon === "medal" ? "medal-outline" : "star-outline"} size={16} color={index === 0 ? palette.gold : palette.muted} /></View><Text style={styles.rewardLabel}>{reward.label}</Text><Text style={styles.rewardAmount}>{currency(reward.amount)}</Text></View>)}</Card>

        <View style={styles.infoStrip}><Icon name="information-circle-outline" size={17} /><Text style={styles.infoText}>Disclaimer: Only contributions from paid participants will be considered for judging.</Text></View>
        <View style={styles.supportRow}><Pressable style={styles.supportCard} onPress={() => showMessage("Prize money explainer ready")}><View style={styles.supportIcon}><Icon name="play" size={16} color={palette.teal} /></View><View style={styles.supportCopy}><Text style={styles.supportTitle}>How will you receive prize money?</Text><Text style={styles.supportNote}>Watch video to know more</Text></View><Icon name="chevron-forward" size={17} color={palette.muted} /></Pressable><View style={[styles.supportCard, styles.policyCard]}><View style={styles.policyLine}><Icon name="shield-checkmark-outline" size={19} /><Text style={styles.supportNote}>Refund policy</Text></View><View style={styles.policyLine}><Icon name="shield-checkmark-outline" size={19} /><Text style={styles.supportNote}>Secure payments powered by Razorpay</Text></View></View></View>

        <View style={styles.referral}><View style={styles.referralIcon}><Icon name="megaphone-outline" size={23} color="#38ac91" /></View><View style={styles.referralCopy}><Text style={styles.referralTitle}>Refer & Earn more discount</Text><Text style={styles.referralNote}>You earn ₹10 for every signup</Text></View><View style={styles.referralActions}><Pressable style={styles.linkBox} onPress={copyReferral}><Icon name="link-outline" size={14} /><Text numberOfLines={1} style={styles.linkText}>feedants.com/r/referral123</Text><Text style={styles.copyText}>Copy</Text></Pressable><Pressable style={styles.referButton} onPress={() => showMessage("Referral invite ready")}><Text style={styles.referText}>Refer Now</Text></Pressable></View></View>

        <Pressable style={styles.reviews} onPress={() => showMessage("Participant stories coming soon")}><View style={styles.reviewIcon}><Icon name="chatbubble-ellipses-outline" size={18} color={palette.ink} /></View><View><Text style={styles.supportTitle}>Hear From Our Users</Text><Text style={styles.supportNote}>See what participants say about Feedants</Text></View><Icon name="chevron-forward" size={18} color={palette.muted} /></Pressable>
        <View style={styles.ad}><Icon name="megaphone-outline" size={16} color="#88959b" /><Text style={styles.adText}>Ad Here</Text></View>

        <Card style={styles.registerCard}><Text style={styles.kicker}><Icon name="sparkles-outline" size={14} /> Your place is almost ready</Text><Text style={styles.registerTitle}>{viewer?.isRegistered ? "You’re in the competition" : "Show your talent to the world"}</Text><Text style={styles.registerDescription}>{viewer?.isRegistered ? "Your slot is secured. Upload your performance when submissions open." : "Join a supportive community of performers and compete for the prize pool."}</Text><View style={styles.priceRow}><Text style={styles.metricLabel}>Entry fee</Text><Text style={styles.priceValue}>{currency(competition.entryFee)}</Text></View><Pressable style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]} onPress={register} disabled={registering}><Text style={styles.primaryText}>{registering ? "Reserving…" : viewer?.isRegistered ? "Registered" : `Register for ${currency(competition.entryFee)}`}</Text><Icon name="chevron-forward" size={17} color="white" /></Pressable><Text style={styles.safeNote}><Icon name="shield-checkmark-outline" size={14} /> Secure checkout · Refund policy applies</Text></Card>

        <Card><SectionTitle title="Submission" /><Text style={styles.uploadDescription}>{viewer?.hasSubmission ? `Uploaded: ${viewer.submissionName}` : "Your performance video can be uploaded after the submission window opens."}</Text><Pressable style={[styles.secondaryButton, !viewer?.isRegistered && styles.disabledButton]} onPress={pickSubmission} disabled={uploading}><Icon name="cloud-upload-outline" size={16} /><Text style={styles.secondaryText}>{uploading ? "Uploading…" : viewer?.hasSubmission ? "Replace submission" : "Upload submission"}</Text></Pressable><Text style={styles.uploadNote}><Icon name="globe-outline" size={13} /> MP4 or MOV · max 100 MB</Text></Card>
      </ScrollView>

      <View style={styles.bottomBar}><Pressable style={styles.bottomItem} onPress={() => showMessage("Home")}><Icon name="home-outline" size={20} /><Text style={styles.bottomText}>Home</Text></Pressable><Pressable style={styles.bottomItem} onPress={() => showMessage("Explore")}><Icon name="search-outline" size={20} color={palette.muted} /><Text style={styles.bottomText}>Explore</Text></Pressable><Pressable style={styles.bottomJoin} onPress={register}><Icon name="add" size={26} color="white" /><Text style={styles.joinText}>Join</Text></Pressable><Pressable style={styles.bottomItem} onPress={() => showMessage("Competitions")}><Icon name="trophy-outline" size={20} /><Text style={styles.bottomText}>Competitions</Text></Pressable><Pressable style={styles.bottomItem} onPress={() => showMessage("Profile")}><Icon name="person-circle-outline" size={20} color={palette.muted} /><Text style={styles.bottomText}>Profile</Text></Pressable></View>
      {message ? <View style={styles.toast}><Icon name="information-circle-outline" size={16} color="white" /><Text style={styles.toastText}>{message}</Text></View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: palette.background },
  scrollContent: { padding: 16, paddingBottom: 92, gap: 12 },
  loading: { flex: 1, alignItems: "center", justifyContent: "center", gap: 14, backgroundColor: palette.background, padding: 24 },
  loadingText: { color: palette.muted, fontSize: 14 },
  errorTitle: { color: palette.ink, fontSize: 22, fontWeight: "700" },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 2 },
  backButton: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 6 },
  backText: { color: palette.ink, fontSize: 13, fontWeight: "700" },
  language: { flexDirection: "row", alignItems: "center", backgroundColor: "#eff4f2", borderRadius: 18, padding: 3 },
  languageActive: { color: "white", backgroundColor: palette.teal, borderRadius: 15, paddingHorizontal: 10, paddingVertical: 6, fontSize: 10, fontWeight: "800" },
  languageMuted: { color: "#8a969f", paddingHorizontal: 9, fontSize: 10, fontWeight: "700" },
  card: { backgroundColor: palette.surface, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: palette.border, shadowColor: "#15424c", shadowOpacity: 0.05, shadowRadius: 14, shadowOffset: { width: 0, height: 8 }, elevation: 1 },
  heroCard: { paddingBottom: 14 },
  titleLine: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 10 },
  titleCopy: { flex: 1 },
  h1: { color: palette.ink, fontSize: 25, lineHeight: 30, fontWeight: "800", letterSpacing: -0.7 },
  tagLine: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 6, marginTop: 9 },
  tag: { color: palette.muted, backgroundColor: "#f2f4f2", borderRadius: 6, paddingHorizontal: 9, paddingVertical: 5, fontSize: 10, fontWeight: "800" },
  certificate: { flexDirection: "row", alignItems: "center", gap: 4, color: palette.teal, fontSize: 10, fontWeight: "700" },
  statusPill: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: palette.tealSoft, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 6 },
  availablePill: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#fff4d4", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 6 },
  statusText: { color: palette.teal, fontSize: 10, fontWeight: "800" },
  availableText: { color: palette.gold, fontSize: 10, fontWeight: "800" },
  heroStats: { flexDirection: "row", gap: 12, alignItems: "center", borderTopWidth: 1, borderTopColor: palette.border, marginTop: 17, paddingTop: 15 },
  metric: { flex: 1 },
  metricLabel: { color: palette.muted, fontSize: 10, fontWeight: "700" },
  metricValue: { color: palette.teal, fontSize: 25, fontWeight: "800", marginTop: 3 },
  darkMetric: { color: palette.ink },
  metricNote: { color: "#9aa5ab", fontSize: 9, marginTop: 2 },
  spots: { flex: 1.25, borderLeftWidth: 1, borderLeftColor: palette.border, paddingLeft: 12 },
  spotsLabel: { color: palette.teal, fontSize: 11, fontWeight: "800" },
  progressTrack: { height: 5, backgroundColor: "#d9eeeb", borderRadius: 5, overflow: "hidden", marginTop: 8 },
  progressFill: { height: 5, backgroundColor: palette.teal, borderRadius: 5 },
  judgeCard: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 13 },
  judgeImage: { width: 66, height: 66, borderRadius: 34, borderWidth: 4, borderColor: "#f4f2ed" },
  judgeCopy: { flex: 1 },
  eyebrow: { color: "#87959d", fontSize: 9, fontWeight: "800", letterSpacing: 1, marginBottom: 4 },
  judgeName: { color: palette.ink, fontSize: 17, fontWeight: "800", marginBottom: 4 },
  judgeInfo: { color: palette.muted, fontSize: 10, marginBottom: 2 },
  videoAction: { alignItems: "center", gap: 5 },
  playCircle: { width: 42, height: 42, borderRadius: 22, backgroundColor: palette.teal, alignItems: "center", justifyContent: "center" },
  videoLabel: { color: palette.muted, fontSize: 9 },
  countdown: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8, padding: 13, borderRadius: 11, backgroundColor: palette.tealSoft, borderWidth: 1, borderColor: "#d8efeb" },
  countdownLabel: { flexDirection: "row", alignItems: "center", gap: 6, flex: 1 },
  countdownTitle: { color: palette.ink, fontSize: 10, fontWeight: "800" },
  countdownValues: { flexDirection: "row", alignItems: "baseline", gap: 2 },
  countdownValue: { color: palette.teal, fontSize: 17, fontWeight: "800" },
  countdownUnit: { fontSize: 9, fontWeight: "600" },
  colon: { color: "#8dc6c0", fontSize: 17, fontWeight: "800" },
  hurry: { color: palette.teal, fontSize: 10, fontWeight: "800" },
  sectionTitleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 13 },
  sectionTitle: { color: palette.ink, fontSize: 15, fontWeight: "800" },
  sectionAction: { color: palette.teal, fontSize: 10, fontWeight: "700" },
  datesGrid: { flexDirection: "row", flexWrap: "wrap", borderWidth: 1, borderColor: "#edf0ee", borderRadius: 11, overflow: "hidden" },
  dateItem: { width: "50%", flexDirection: "row", alignItems: "center", gap: 9, padding: 12, borderBottomWidth: 1, borderBottomColor: "#edf0ee" },
  dateIcon: { width: 33, height: 33, borderRadius: 10, alignItems: "center", justifyContent: "center", backgroundColor: "#effaf8" },
  dateLabel: { color: palette.muted, fontSize: 9, marginBottom: 3 },
  dateValue: { color: palette.ink, fontSize: 11, fontWeight: "800" },
  dateTime: { color: palette.muted, fontSize: 10, marginTop: 2 },
  tealText: { color: palette.teal },
  winnersRow: { gap: 10 },
  winnerCard: { width: 125, padding: 7, borderWidth: 1, borderColor: "#edf0ee", borderRadius: 11, backgroundColor: "#fbfcfb" },
  winnerImage: { width: 111, height: 63, borderRadius: 9 },
  winnerPlay: { position: "absolute", right: 3, bottom: 3, width: 18, height: 18, borderRadius: 10, backgroundColor: palette.teal, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: "white" },
  winnerName: { color: palette.ink, fontSize: 10, fontWeight: "800", marginTop: 6 },
  winnerPlace: { color: palette.teal, fontSize: 9, marginTop: 3 },
  aboutCard: { padding: 0, overflow: "hidden" },
  tabs: { borderBottomWidth: 1, borderBottomColor: palette.border, paddingHorizontal: 7 },
  tab: { paddingHorizontal: 9, paddingVertical: 15, borderBottomWidth: 2, borderBottomColor: "transparent" },
  tabActive: { borderBottomColor: palette.teal },
  tabText: { color: palette.muted, fontSize: 10, fontWeight: "700" },
  tabTextActive: { color: palette.teal },
  aboutText: { color: palette.muted, fontSize: 11, lineHeight: 18, padding: 16, paddingBottom: 8 },
  moreText: { alignSelf: "center", color: palette.teal, fontSize: 10, fontWeight: "800", paddingBottom: 16 },
  rewardRow: { flexDirection: "row", alignItems: "center", gap: 9, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: "#f0f2f0" },
  rewardIcon: { width: 23, height: 23, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: "#eef4f4" },
  goldIcon: { backgroundColor: "#fff4ca" },
  rewardLabel: { flex: 1, color: palette.ink, fontSize: 11, fontWeight: "700" },
  rewardAmount: { color: palette.teal, fontSize: 14, fontWeight: "800" },
  infoStrip: { flexDirection: "row", alignItems: "center", gap: 7, padding: 10, backgroundColor: palette.tealSoft, borderWidth: 1, borderColor: "#d5eeea", borderRadius: 9 },
  infoText: { flex: 1, color: "#4d7276", fontSize: 9, lineHeight: 13 },
  supportRow: { gap: 10 },
  supportCard: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: palette.surface, borderWidth: 1, borderColor: palette.border, borderRadius: 14, padding: 14 },
  supportIcon: { width: 35, height: 35, borderRadius: 10, backgroundColor: "#eaf8f6", alignItems: "center", justifyContent: "center" },
  supportCopy: { flex: 1 },
  supportTitle: { color: palette.ink, fontSize: 11, fontWeight: "800" },
  supportNote: { color: palette.muted, fontSize: 9, marginTop: 3 },
  policyCard: { flexDirection: "column", alignItems: "flex-start", gap: 8 },
  policyLine: { flexDirection: "row", alignItems: "center", gap: 8 },
  referral: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 10, padding: 14, backgroundColor: "#e9fcf0", borderWidth: 1, borderColor: "#cdeedd", borderRadius: 14 },
  referralIcon: { width: 42, height: 42, borderRadius: 13, backgroundColor: "#c8f2dc", alignItems: "center", justifyContent: "center" },
  referralCopy: { flex: 1 },
  referralTitle: { color: palette.ink, fontSize: 12, fontWeight: "800" },
  referralNote: { color: palette.teal, fontSize: 9, fontWeight: "700", marginTop: 4 },
  referralActions: { width: "100%", flexDirection: "row", gap: 8 },
  linkBox: { flex: 1, flexDirection: "row", alignItems: "center", gap: 5, padding: 8, backgroundColor: "white", borderWidth: 1, borderColor: "#cbe6d8", borderRadius: 7 },
  linkText: { flex: 1, color: "#62807c", fontSize: 8 },
  copyText: { color: palette.teal, fontSize: 9, fontWeight: "800" },
  referButton: { paddingHorizontal: 13, alignItems: "center", justifyContent: "center", backgroundColor: palette.teal, borderRadius: 7 },
  referText: { color: "white", fontSize: 10, fontWeight: "800" },
  reviews: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: palette.surface, borderWidth: 1, borderColor: palette.border, borderRadius: 14, padding: 14 },
  reviewIcon: { width: 34, height: 34, borderWidth: 2, borderColor: palette.ink, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  ad: { height: 42, borderWidth: 1, borderStyle: "dashed", borderColor: "#bdcac7", borderRadius: 9, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 7 },
  adText: { color: "#88959b", fontSize: 10 },
  registerCard: { backgroundColor: "#effbf8", borderColor: "#d5eeea" },
  kicker: { color: palette.teal, fontSize: 10, fontWeight: "800", marginBottom: 13 },
  registerTitle: { color: palette.ink, fontSize: 22, lineHeight: 26, fontWeight: "800", letterSpacing: -0.5 },
  registerDescription: { color: palette.muted, fontSize: 11, lineHeight: 17, marginTop: 8, marginBottom: 14 },
  priceRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 11, borderTopWidth: 1, borderBottomWidth: 1, borderColor: "#d6edeb", marginBottom: 12 },
  priceValue: { color: palette.teal, fontSize: 23, fontWeight: "800" },
  primaryButton: { minHeight: 44, borderRadius: 9, backgroundColor: palette.teal, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 6, paddingHorizontal: 14 },
  primaryText: { color: "white", fontSize: 11, fontWeight: "800" },
  pressed: { transform: [{ scale: 0.97 }], opacity: 0.9 },
  safeNote: { color: "#82918d", fontSize: 9, textAlign: "center", marginTop: 11 },
  uploadDescription: { color: palette.muted, fontSize: 10, lineHeight: 15, marginBottom: 13 },
  secondaryButton: { minHeight: 42, borderRadius: 9, backgroundColor: palette.tealSoft, borderWidth: 1, borderColor: "#cbeae5", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 },
  disabledButton: { opacity: 0.55 },
  secondaryText: { color: palette.teal, fontSize: 11, fontWeight: "800" },
  uploadNote: { color: "#94a09e", fontSize: 9, textAlign: "center", marginTop: 9 },
  bottomBar: { position: "absolute", left: 0, right: 0, bottom: 0, height: 67, backgroundColor: "rgba(255,255,255,0.97)", borderTopWidth: 1, borderTopColor: "#e4edeb", flexDirection: "row", justifyContent: "space-around", alignItems: "center", paddingHorizontal: 7 },
  bottomItem: { alignItems: "center", gap: 3, minWidth: 54 },
  bottomText: { color: palette.muted, fontSize: 8, fontWeight: "700" },
  bottomJoin: { width: 52, height: 52, marginTop: -22, borderRadius: 17, backgroundColor: palette.teal, borderWidth: 5, borderColor: palette.background, alignItems: "center", justifyContent: "center" },
  joinText: { color: "white", fontSize: 8, fontWeight: "800" },
  toast: { position: "absolute", left: 16, right: 16, bottom: 78, flexDirection: "row", alignItems: "center", gap: 7, paddingHorizontal: 13, paddingVertical: 11, backgroundColor: "#17354b", borderRadius: 11, shadowColor: "#000", shadowOpacity: 0.18, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 5 },
  toastText: { flex: 1, color: "white", fontSize: 11, fontWeight: "700" },
});
