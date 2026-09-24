import { useEffect, useMemo, useRef, useState, type ChangeEvent, type ComponentType, type ReactNode } from "react";
import {
  ArrowLeft,
  Award,
  BadgeCheck,
  CalendarDays,
  ChevronDown,
  ChevronRight,
  CircleCheck,
  Clock3,
  FileVideo,
  Gift,
  Globe2,
  Home as HomeIcon,
  Info,
  Link2,
  ListChecks,
  Megaphone,
  MessageCircle,
  Play,
  PlusCircle,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  TimerReset,
  Trophy,
  Upload,
  UserCircle,
  Users,
  Video,
  WalletCards,
} from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

const SLUG = "feedants-classical-dance";
const PARTICIPANT_KEY = "preview-participant-001";

type TabKey = "about" | "judging" | "rules";

type Countdown = {
  days: string;
  hours: string;
  minutes: string;
  seconds: string;
};

function getCountdown(target: number): Countdown {
  const difference = Math.max(0, target - Date.now());
  const totalSeconds = Math.floor(difference / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return {
    days: String(days).padStart(2, "0"),
    hours: String(hours).padStart(2, "0"),
    minutes: String(minutes).padStart(2, "0"),
    seconds: String(seconds).padStart(2, "0"),
  };
}

function formatDate(timestamp: number) {
  return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "2-digit" }).format(timestamp);
}

function formatTime(timestamp: number) {
  return new Intl.DateTimeFormat("en-IN", { hour: "2-digit", minute: "2-digit" }).format(timestamp);
}

function formatCurrency(amount: number) {
  return `₹${amount.toLocaleString("en-IN")}`;
}

function SectionHeading({ eyebrow, title, action }: { eyebrow?: string; title: string; action?: ReactNode }) {
  return (
    <div className="section-heading">
      <div>
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h2>{title}</h2>
      </div>
      {action}
    </div>
  );
}

type IconType = ComponentType<{ size?: number; strokeWidth?: number }>;

function InfoDate({ icon: Icon, label, timestamp, accent }: { icon: IconType; label: string; timestamp: number; accent?: boolean }) {
  return (
    <div className="date-item">
      <div className="date-icon"><Icon size={19} strokeWidth={1.8} /></div>
      <div>
        <span>{label}</span>
        <strong className={accent ? "accent-text" : ""}>{formatDate(timestamp)}</strong>
        <small>{formatTime(timestamp)}</small>
      </div>
    </div>
  );
}

export default function Home() {
  const [activeTab, setActiveTab] = useState<TabKey>("about");
  const [countdown, setCountdown] = useState<Countdown>({ days: "00", hours: "00", minutes: "00", seconds: "00" });
  const [copied, setCopied] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const utils = trpc.useUtils();

  const competitionQuery = trpc.competition.getBySlug.useQuery({ slug: SLUG, participantKey: PARTICIPANT_KEY }, {
    refetchOnWindowFocus: false,
  });
  const registerMutation = trpc.competition.register.useMutation({
    onSuccess: (result) => {
      toast.success(result.alreadyRegistered ? "You are already registered" : "Registration confirmed", {
        description: result.alreadyRegistered ? "Your place is safely held." : "Your ₹99 entry slot is reserved.",
      });
      void utils.competition.getBySlug.invalidate({ slug: SLUG, participantKey: PARTICIPANT_KEY });
    },
    onError: (error) => toast.error("Registration could not be completed", { description: error.message }),
  });
  const submitMutation = trpc.competition.submit.useMutation({
    onSuccess: (result) => {
      toast.success("Submission staged", { description: `${result.fileName} is ready for review.` });
      void utils.competition.getBySlug.invalidate({ slug: SLUG, participantKey: PARTICIPANT_KEY });
    },
    onError: (error) => toast.error("Submission not available yet", { description: error.message }),
  });

  const competition = competitionQuery.data?.competition;
  const viewer = competitionQuery.data?.viewer;

  useEffect(() => {
    if (!competition) return;
    setCountdown(getCountdown(competition.registrationDeadline));
    const interval = window.setInterval(() => setCountdown(getCountdown(competition.registrationDeadline)), 1000);
    return () => window.clearInterval(interval);
  }, [competition?.registrationDeadline]);

  const dateRows = useMemo(() => {
    if (!competition) return [];
    return [
      { icon: CalendarDays, label: "Register Before", timestamp: competition.registrationDeadline, accent: true },
      { icon: SendIcon, label: "Submission Starts", timestamp: competition.submissionStartsAt },
      { icon: Upload, label: "Submission Ends", timestamp: competition.submissionEndsAt, accent: true },
      { icon: Trophy, label: "Result Date", timestamp: competition.resultDate },
    ];
  }, [competition]);

  const register = () => {
    if (viewer?.isRegistered) {
      toast.info("You are already registered", { description: "Your competition slot is secured." });
      return;
    }
    registerMutation.mutate({ slug: SLUG, participantKey: PARTICIPANT_KEY });
  };

  const handleUploadChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    submitMutation.mutate({ slug: SLUG, participantKey: PARTICIPANT_KEY, fileName: file.name });
    event.target.value = "";
  };

  const copyReferral = async () => {
    const link = "https://feedants.com/r/referral123";
    try {
      await navigator.clipboard?.writeText(link);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
      toast.success("Referral link copied");
    } catch {
      toast.info(link);
    }
  };

  const playVideo = (name = "Intro video") => toast.info(`${name} preview`, { description: "Video player is ready for the production media URL." });

  if (competitionQuery.isLoading) {
    return <div className="app-shell loading-shell"><div className="loading-card"><div className="loading-mark">F</div><p>Preparing your competition details…</p></div></div>;
  }

  if (competitionQuery.error || !competition) {
    return <div className="app-shell loading-shell"><div className="loading-card"><div className="loading-mark">!</div><h1>Competition unavailable</h1><p>{competitionQuery.error?.message ?? "Please try again in a moment."}</p><button className="primary-button" onClick={() => void competitionQuery.refetch()}>Try again</button></div></div>;
  }

  const tabCopy: Record<TabKey, string> = {
    about: competition.about,
    judging: competition.judgingParameters,
    rules: competition.rules,
  };

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="topbar-inner">
          <button className="brand" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} aria-label="Go to top">
            <span className="brand-mark">F</span><span className="brand-word">feedants</span>
          </button>
          <nav className="desktop-nav" aria-label="Main navigation">
            <button className="nav-link active" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>Competitions</button>
            <button className="nav-link" onClick={() => toast.info("Explore is coming soon")}>Explore</button>
            <button className="nav-link" onClick={() => toast.info("Your profile is ready for the full app")}>My activity</button>
          </nav>
          <div className="topbar-actions">
            <button className="icon-button" aria-label="Search" onClick={() => toast.info("Search competitions", { description: "Search is ready to be connected to the competition catalog." })}><Search size={18} /></button>
            <button className="profile-chip" onClick={() => toast.info("Preview participant profile")}><span className="avatar avatar-small">PS</span><span className="profile-chip-copy"><strong>Participant</strong><small>Preview mode</small></span><ChevronDown size={15} /></button>
          </div>
        </div>
      </header>

      <main className="page-container">
        <div className="breadcrumb-row">
          <button className="back-button" onClick={() => window.history.length > 1 ? window.history.back() : window.scrollTo({ top: 0, behavior: "smooth" })}><ArrowLeft size={17} /> Go back</button>
          <div className="language-toggle"><button className="language-active">ENG</button><button>हिंदी</button></div>
        </div>

        <div className="page-grid">
          <section className="main-column">
            <section className="hero-card surface-card">
              <div className="hero-topline">
                <div>
                  <div className="title-row"><h1>{competition.title}</h1><span className={viewer?.isRegistered ? "verified-pill" : "available-pill"}>{viewer?.isRegistered ? <><BadgeCheck size={15} /> Registered</> : <><Sparkles size={14} /> Available</>}</span></div>
                  <div className="tag-row"><span>{competition.category}</span><span>{competition.format}</span>{competition.certificate && <span className="certificate-tag"><Award size={14} /> Winners get certificate</span>}</div>
                </div>
                <div className="status-dot"><CircleCheck size={16} /> Open</div>
              </div>
              <div className="hero-stats">
                <div className="stat-block"><span>Prize Pool</span><strong>{formatCurrency(competition.prizePool)}</strong><small>Across 6 winning positions</small></div>
                <div className="stat-block"><span>Entry Fee</span><strong>{formatCurrency(competition.entryFee)}</strong><small>One-time participation fee</small></div>
                <div className="spots-block"><div className="spots-header"><span><Users size={17} /> Only {competition.spotsLeft} spots left</span><strong>{competition.booked} / {competition.capacity} Booked</strong></div><div className="progress-track"><div className="progress-fill" style={{ width: `${Math.min(100, (competition.booked / competition.capacity) * 100)}%` }} /></div></div>
              </div>
            </section>

            <section className="judge-card surface-card">
              <img className="judge-image" src={competition.judge.image} alt={competition.judge.name} />
              <div className="judge-copy"><span className="eyebrow">Judge</span><h2>{competition.judge.name}</h2><p>{competition.judge.role}</p><p>{competition.judge.experience}</p></div>
              <button className="video-button" onClick={() => playVideo("Judge intro video")}><span><Play size={21} fill="currentColor" /></span><small>Intro Video</small></button>
            </section>

            <section className="countdown-banner">
              <div className="countdown-label"><TimerReset size={21} /><strong>Registration closes in</strong></div>
              <div className="countdown-values"><b>{countdown.days}<small>d</small></b><i>:</i><b>{countdown.hours}<small>h</small></b><i>:</i><b>{countdown.minutes}<small>m</small></b><i>:</i><b>{countdown.seconds}<small>s</small></b></div>
              <button onClick={register}><Clock3 size={17} /> Hurry up!</button>
            </section>

            <section className="content-section">
              <SectionHeading title="Important Dates" />
              <div className="dates-grid">{dateRows.map((row) => <InfoDate key={row.label} {...row} />)}</div>
            </section>

            <section className="content-section winners-section">
              <SectionHeading title="Previous Winners" action={<button className="text-action" onClick={() => toast.info("All previous winners", { description: "Winner archive will be available in the next catalog view." })}>View all <ChevronRight size={15} /></button>} />
              <div className="winner-scroller">{competition.winners.map((winner, index) => <button className="winner-card" key={`${winner.name}-${index}`} onClick={() => playVideo(`${winner.name} performance`)}><div className="winner-photo-wrap"><img src={winner.image} alt={winner.name} /><span className="play-badge"><Play size={13} fill="currentColor" /></span></div><div className="winner-copy"><strong>{winner.name}</strong><span>{winner.place}</span></div></button>)}</div>
            </section>

            <section className="content-section about-section">
              <div className="tab-row" role="tablist">{([["about", "About Competition"], ["judging", "Judging Parameters"], ["rules", "Rules & Eligibility"]] as [TabKey, string][]).map(([key, label]) => <button key={key} className={activeTab === key ? "tab active" : "tab"} onClick={() => setActiveTab(key)} role="tab" aria-selected={activeTab === key}>{label}</button>)}</div>
              <div className="tab-copy"><p>{tabCopy[activeTab]}</p><button className="more-button" onClick={() => toast.info("Full details", { description: tabCopy[activeTab] })}>View more <ChevronDown size={15} /></button></div>
            </section>

            <section className="content-section rewards-section">
              <SectionHeading title="Rewards" action={<span className="all-positions">(All Positions)</span>} />
              <div className="reward-list">{competition.rewards.map((reward, index) => <div className="reward-row" key={reward.label}><span className={`reward-icon reward-${index + 1}`}>{reward.icon === "trophy" ? <Trophy size={17} /> : reward.icon === "medal" ? <Award size={17} /> : <Star size={17} />}</span><strong>{reward.label}</strong><b>{formatCurrency(reward.amount)}</b></div>)}</div>
            </section>

            <div className="info-strip"><Info size={17} /><span>Disclaimer: Only contributions from paid participants will be considered for judging.</span></div>

            <section className="support-grid">
              <button className="support-card video-support" onClick={() => playVideo("Prize money explainer")}><span className="support-icon"><Play size={17} fill="currentColor" /></span><span><strong>How will you receive prize money?</strong><small>Watch video to know more</small></span><ChevronRight size={17} /></button>
              <div className="support-card policy-support"><div><ShieldCheck size={21} /><span>Refund policy</span></div><div><ShieldCheck size={21} /><span>Secure payments powered by <b>Razorpay</b></span></div></div>
            </section>

            <section className="referral-card">
              <div className="referral-icon"><Megaphone size={24} /></div><div className="referral-copy"><h3>Refer & Earn more discount</h3><p>You earn ₹10 for every signup</p></div><div className="referral-actions"><div className="referral-link"><Link2 size={15} /><span>https://feedants.com/r/referral123</span><button onClick={copyReferral}>{copied ? "Copied" : "Copy Link"}</button></div><button className="refer-button" onClick={() => toast.success("Referral invite ready", { description: "Share your link with a dance friend." })}>Refer Now</button></div>
            </section>

            <button className="reviews-card" onClick={() => toast.info("Participant stories", { description: "Reviews from Feedants participants will appear here." })}><span className="reviews-icon"><MessageCircle size={19} /></span><span><strong>Hear From Our Users</strong><small>See what participants say about Feedants</small></span><ChevronRight size={18} /></button>
            <div className="ad-slot"><Megaphone size={17} /> Ad Here</div>
          </section>

          <aside className="sidebar-column">
            <section className="sidebar-card register-card">
              <span className="side-kicker"><Sparkles size={15} /> Your place is almost ready</span><h2>{viewer?.isRegistered ? "You’re in the competition" : "Show your talent to the world"}</h2><p>{viewer?.isRegistered ? "You have a secured slot. Upload your performance when submissions open." : "Join a supportive community of performers and compete for the prize pool."}</p>
              <div className="side-price"><span>Entry fee</span><strong>{formatCurrency(competition.entryFee)}</strong></div>
              <button className="primary-button full-width" onClick={register} disabled={registerMutation.isPending}>{registerMutation.isPending ? "Reserving…" : viewer?.isRegistered ? "Registered" : `Register for ${formatCurrency(competition.entryFee)}`} <ChevronRight size={17} /></button>
              <div className="safe-note"><ShieldCheck size={16} /> Secure checkout · Refund policy applies</div>
            </section>
            <section className="sidebar-card timeline-card"><div className="sidebar-title"><span>Competition timeline</span><Clock3 size={17} /></div><div className="timeline"><div className="timeline-step complete"><span>1</span><div><strong>Registration</strong><small>Open until {formatDate(competition.registrationDeadline)}</small></div></div><div className="timeline-step"><span>2</span><div><strong>Submission window</strong><small>06 Oct – 30 Oct 2026</small></div></div><div className="timeline-step"><span>3</span><div><strong>Results announced</strong><small>{formatDate(competition.resultDate)}</small></div></div></div></section>
            <section className="sidebar-card upload-card"><div className="sidebar-title"><span>Submission</span><FileVideo size={17} /></div><p>{viewer?.hasSubmission ? `Uploaded: ${viewer.submissionName}` : "Your performance video can be uploaded after the submission window opens."}</p><input ref={fileInputRef} type="file" accept="video/*" className="hidden-input" onChange={handleUploadChange} /><button className="secondary-button full-width" onClick={() => fileInputRef.current?.click()} disabled={!viewer?.isRegistered || submitMutation.isPending}><Upload size={16} /> {submitMutation.isPending ? "Uploading…" : viewer?.hasSubmission ? "Replace submission" : "Upload submission"}</button><small className="upload-note"><Globe2 size={13} /> MP4 or MOV · max 100 MB</small></section>
          </aside>
        </div>
      </main>

      <nav className="mobile-bottom-nav" aria-label="Mobile navigation">
        <button className="mobile-nav-item active" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}><HomeIcon size={19} /><span>Home</span></button><button className="mobile-nav-item" onClick={() => toast.info("Explore is coming soon")}><Search size={19} /><span>Explore</span></button><button className="mobile-nav-add" onClick={register}><PlusCircle size={26} /><span>Join</span></button><button className="mobile-nav-item" onClick={() => toast.info("Competition list is open")}><Trophy size={19} /><span>Competitions</span></button><button className="mobile-nav-item" onClick={() => toast.info("Preview participant profile")}><UserCircle size={19} /><span>Profile</span></button>
      </nav>
      <div className="mobile-cta"><button className="primary-button full-width" onClick={register} disabled={registerMutation.isPending}>{viewer?.isRegistered ? "Registered" : `Register for ${formatCurrency(competition.entryFee)}`}<ChevronRight size={17} /></button></div>
    </div>
  );
}

function SendIcon(props: { size?: number; strokeWidth?: number }) {
  return <svg viewBox="0 0 24 24" width={props.size ?? 20} height={props.size ?? 20} fill="none" stroke="currentColor" strokeWidth={props.strokeWidth ?? 1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m22 2-7 20-4-9-9-4Z" /><path d="M22 2 11 13" /></svg>;
}
