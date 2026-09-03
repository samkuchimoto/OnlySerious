# Competitor UX Teardown — Hinge & ThaiFriendly

Recovered from a screenshot-mining workflow that finished all 131 findings before its parent session disconnected before the report could be delivered. Source screenshots (118 total, sent 2026-09-02) are in the local Downloads folder: ThaiFriendly (32 loose files, `1000078805.jpg`–`1000078867.jpg`), Hinge (86 files across `hingepart1`, `hingepart2`, `hingepart3`, `hinge4`, `hinge5`).

Full raw catalog: 131 patterns (Hinge 66, ThaiFriendly 65).

---

## Priority build queue

Synthesis against OSThai's actual state, the standing app/page.tsx principle (ThaiFriendly IA leads, Hinge visual polish layers on top, English-only for now), and the Sept 13 push (1,000 real Thai profiles, 100 downloads, women registering first).

### Tier 1 — Registration conversion (ship before Sept 13)
- **Outcome-tied photo-count nudge** (ThaiFriendly) — helper text under the photo grid: "Upload more photos to get more messages! We recommend at least 6 good photos."
- **Thin onboarding progress bar** (Hinge) — 3px bar under the header, fills as onboarding advances, no label needed.
- **Live self-preview before going live** (ThaiFriendly PREVIEW tab) — a tab that renders the profile exactly as others will see it, before activation.
- **Soft-ask before the OS push prompt** (Hinge) — a value-prop screen before the native permission dialog fires.
- **Full-bleed pacing interstitials** (Hinge) — one photo + one line + Continue between onboarding field clusters.

### Tier 2 — Trust signals for women
- **Visible "Photo Verified" badge** (ThaiFriendly) — surface the selfie-verification OSThai already runs as a visible pill.
- **"Hidden" as a lighter action than Block** (ThaiFriendly) — quiet dismissal without the report/block weight.
- **Nationality flag chip** (ThaiFriendly) — real filtering/trust signal given Thailand's foreign-resident dating pool.
- **Per-field "visible on profile" toggle** (Hinge) — usable for matching without being published.
- **Categorized Safety Center** (Hinge) — grouped, browsable safety articles, not just legal boilerplate.

### Tier 3 — Compatibility depth
- **Dating Intentions field** (Hinge) — single highest-signal compatibility field per the research; OSThai has none today.
- **Structured attribute chips** (Hinge + ThaiFriendly) — height, education, children status, religion (optional).
- **Two-tier bio: headline + full text** (ThaiFriendly) — punchier one-liner for browse cards.

### Tier 4 — Browse & engagement polish
- **Online / last-active status** (ThaiFriendly) — reinforces the grid-browse IA already chosen for OSThai.
- **"NEW" and "Messaged You" card badges** (ThaiFriendly) — cheap grid differentiators.
- **Private per-profile notes** (ThaiFriendly) — personal recall cue, viewer-only.
- **Message-anyone vs. mutual-match gate** (ThaiFriendly) — flagged as a real decision point, not a default build.

### Tier 5 — Monetization (defer — no billing wired up yet)
- **"Liked Me" paywall blur** (ThaiFriendly)
- **Message Priority + Incognito browsing** (ThaiFriendly premium)
- **Tiered consumables: Boost / Roses / Standouts** (Hinge)

---

## Full catalog — Hinge (66)

- **Privacy-reassurance microcopy + pill country-code selector** — *Phone number entry (onboarding)*
  Headline 'What's your phone number?' in large black serif font, centered, on a soft gray-blue gradient background. Directly below it, centered gray sans-serif body text: 'We only ask to verify it's you. It won't be displayed anywhere, including your profile.' Below that, two side-by-side rounded-rect light-gray fields of equal height/corner-radius so they read as one control: a fixed-width country pill on the left (flag emoji + '+[code]', e.g. a France flag + '+33', plus a chevron-down that opens a country picker) and the actual 'Phone number' text field on the right. A black pill 'Continue' CTA sits near the bottom with helper text underneath: 'Hinge will send you a text with a verification code. Message and data rates may apply.'

- **Full-bleed lifestyle-photo chapter break between onboarding steps** — *Onboarding transition interstitial*
  Between groups of onboarding questions, a full-screen editorial/lifestyle photo fills the whole viewport with a soft gradient fade to off-white starting about two-thirds down. A centered serif headline sits over the fade area (observed copy: 'Your profile is a glimpse of you.') with a single black pill 'Continue' button near the bottom. No form fields on this screen — it's a pure narrative pacing beat that breaks up the onboarding form into 'chapters' before the next question group (used here right before the name-entry step).

- **First/Last name split, last name optional & match-only visibility, explicit no-verification disclaimer** — *Name entry (onboarding)*
  Headline 'What's your name?'; body copy directly under it: 'Hinge doesn't verify names or run background checks. We count on daters to be real with each other.' Two stacked rounded input fields: 'First name' (required) and 'Last name (optional)'. Under the last-name field, centered helper text: 'Last name is optional and only shared with matches. Why?' (tappable link). Mechanic: last name is captured but withheld from the public/browsable profile card, and only revealed to the other person after a mutual match — giving daters a way to look someone up/verify identity post-match while pre-match browsing stays first-name-only.

- **Default-opt-in marketing consent via explicit opt-out checkbox** — *Email entry (onboarding)*
  Under the 'Your email' field, copy reads: 'We'll use your email to send you communications, including a verification code. It won't be shared with other daters. Learn more' (bold 'Learn more' link). Below that, in its own light-gray rounded box, an unchecked square checkbox is paired with: 'If you don't wish to receive marketing communications about our products and services, check this box' — marketing emails are opt-out (checking the box opts you OUT), not opt-in by default.

- **Three tap-to-type date fields + age-confirmation bottom sheet** — *Birthday entry (onboarding)*
  Headline 'When's your birthday?', subcopy 'We'll only show your age on your profile.' Three separate rounded-rect fields in a row for day / month / year (locale-ordered), each tappable to bring up a numeric keypad for direct digit entry — no scroll-wheel or calendar picker. After tapping Continue, a white rounded bottom-sheet slides up over a dimmed backdrop showing the computed age in bold ('You're 36') with copy 'Make sure your age is correct before moving on. It keeps Hinge real for everyone.', and two side-by-side buttons: outlined 'Edit' (dismisses sheet, returns to the fields) and solid black 'Confirm' (proceeds).

- **Soft-ask pre-permission screen before the native OS prompt** — *Push notification permission priming (onboarding)*
  Full-bleed photo background (two hands reaching toward each other against a cloudy sky) with centered serif headline 'Don't miss when someone wants to connect.' A translucent light rounded-rect row near the bottom reads 'Turn on notifications' with a toggle switch on the right, defaulted ON. Only after the user engages this custom screen and taps Continue does the app fire the native OS 'Allow Hinge to send you notifications? Allow / Don't allow' system dialog — pre-framing the value proposition before the OS-level ask to maximize opt-in rate.

- **Inline contextual help links deep-linking to specific Help Center articles** — *Onboarding form fields, general*
  Underneath a given onboarding field (observed on phone-number entry), a small secondary link ('What if my number changes?') opens an in-app browser directly to the matching Help Center article — titled 'How do I change my phone number?', with a breadcrumb (Hinge / Managing My Profile / My Account Settings) and a 'Last updated [date]' stamp, explaining the actual policy (no self-service number change; must contact support with the old number + written confirmation to delete the old account). Help content is field-specific and deep-linked from the exact onboarding step where the question would arise, not a generic FAQ homepage.

- **Profile-completion empty state with stacked premium upsell CTA** — *Likes You tab (empty state)*
  Full-screen empty state under a large bold 'Likes You' heading: a black-line-art illustration of birds flying over a pink circular backdrop, then a serif italic-style line 'Complete your profile to start getting likes'. Below it are two stacked full-width pill buttons: a solid black 'Edit profile' button (white text) as the primary CTA, and directly beneath it a white/outline pill button '✨ Upgrade to HingeX' with a sparkle icon as the secondary CTA — i.e. the premium subscription pitch is placed as the very next action on a core, high-traffic empty screen rather than buried in settings.

- **Algorithmic 'Standouts' card carousel gated behind a Roses currency** — *Standouts tab (dedicated bottom-nav item)*
  A dedicated bottom-nav tab (star icon, next to Likes/heart and Messages/chat-bubble icons) opens a horizontal swipeable deck titled 'Standouts' with a small (i) info icon beside the title that opens an explainer. Top-right shows a lavender pill button '🌹 Roses (0)' — a distinct, countable currency separate from ordinary likes. Each card shows the person's first name in bold white text overlaid directly on the photo (top-left, no background chip) plus one prompt answer in a small white card near the bottom of the photo, with its own rose-icon send button in place of the normal heart — i.e. sending a like to a Standout consumes a Rose instead of a regular like.

- **Structured attribute badge rows for religion / dating intentions / relationship style, separate from prompts** — *Profile detail view (viewing another user's full profile)*
  Below the top vitals row (icon+age, icon+gender 'Woman', icon+orientation 'Straight', separated by thin vertical dividers) the profile lists further self-reported facts as individual full-width rows, each a small line-icon on the left + short label on the right: an open-book icon for religion ('Atheist'), a magnifying-glass icon for dating intentions ('Figuring out my dating goals'), a two-person icon for relationship structure ('Monogamy'). These are short tap-free glance badges interleaved between prompt cards and photos in the scroll feed — structured, filterable-looking facts distinct from the 3 free-form prompt answers.

- **Video clip as a prompt answer** — *Profile detail view, prompt slot*
  A prompt ('Together we can be terrible at') is answered with a short auto-playing, muted video clip instead of a photo, occupying the exact same full-width slide position as a photo in the profile's vertical scroll. A small dark circular icon (speaker with an 'x') sits fixed in the top-left corner of the video indicating/toggling mute; a heart 'like this answer' button sits bottom-right, identical placement to the per-photo/per-prompt heart used elsewhere.

- **Persistent 'complete your profile to unlock actions' banner shown while browsing other people** — *Profile detail view (viewing another user's profile, own profile incomplete)*
  A blush-pink rounded-rectangle banner is pinned near the top of the profile-viewing screen and recurs at the same position as the viewer scrolls down through that other person's photos/prompts (i.e. it re-appears on every scroll position captured). Copy: 'Complete your profile to send and receive messages, likes and roses.' with a white pill 'Edit profile' button. Core reciprocal actions (message, like, send rose) on someone else's profile are blocked/nagged specifically while the incomplete-profile user is actively browsing, not just when they're on their own profile tab.

- **User's own live avatar as the nav icon, with a red '!' alert badge for outstanding account actions** — *Bottom navigation bar (global)*
  The rightmost of 5 bottom-nav icons is the user's own circular profile photo thumbnail (not a generic person/gear icon), with a small solid-red circle containing a white '!' pinned to its top-right corner. It is used to flag an account issue needing attention (here: incomplete profile) directly on the avatar rather than as a numeric unread count, and persists across every screen in the app.

- **Single-select relationship-goal field** — *Onboarding — Dating Intentions*
  Full-width rounded cards rendered as a radio list of 7 mutually-exclusive options: 'Life partner', 'Long-term relationship', 'Long-term relationship, open to short', 'Short-term relationship, open to long', 'Short-term relationship', 'Figuring out my dating goals', 'Prefer not to say'. Selected card gets a black outline border + light taupe/gray fill + filled black radio dot; unselected cards are plain white on the cream page background. First-time entry shows a large centered serif headline 'What kind of connection are you open to?' with no title bar; re-visiting via edit shows a compact sans-serif title bar 'Dating Intentions' instead. A 'Visible on profile' checkbox (checked by default) sits below the list. This is the single highest-signal compatibility field a 'serious relationship' app could add — OSThai's onboarding currently only captures gender/interestedIn/city/country/birthdate with no explicit relationship-goal declaration.

- **"Share more in your own words" expandable add-on** — *Dating Intentions (after an option is selected)*
  Once a radio option is chosen, a dashed-border rounded pill appears below the list with a '+' icon and copy 'Share more about what you're looking for, in your own words' — tapping it opens a free-text field so the user can layer nuance on top of the structured/categorical answer instead of being limited to one or the other.

- **Independent "Visible on profile" privacy toggle per field** — *Every onboarding/profile-detail screen (education, workplace, hometown, children, religion, politics, lifestyle, dating intentions)*
  Each structured attribute carries its own checkbox — a black filled square with white check when on, an empty white-outlined square when off — labeled 'Visible on profile', placed directly under that field's input/options. This lets a user answer a question for matching purposes without it appearing on their public profile card. On the Education 'highest level attained' chip-select, the same hidden state is instead shown via an eye-with-slash icon plus the words 'Hidden on profile' next to the selected chip, an alternate compact treatment used when the field is chip-based rather than checkbox-based.

- **Full-bleed photo "breather" screen with editorial serif copy** — *Section-divider interstitials (between Dating-Intentions and Education/Work/Hometown; between Family and Religion/Politics)*
  Edge-to-edge lifestyle photograph (e.g. hands flipping through vinyl records; a couple by a bicycle), fading to the page's cream background in the bottom third, with large centered serif overlay text ('These next details can help others connect with you.' / 'We ask about your beliefs and preferences to help others better understand what matters to you.') and a single black rounded-pill 'Continue' button near the bottom. No form fields on this screen — it's purely a paced, motivational transition between clusters of onboarding questions, breaking up what would otherwise be a long uninterrupted form.

- **Multiple related sub-questions bundled as stacked elevated cards on one screen** — *Education, Workplace, Lifestyle screens*
  A small centered sans-serif title bar names the section (e.g. 'Education', 'Workplace', 'Lifestyle'), and 2-4 distinct sub-questions each live in their own white rounded-corner (~20px radius) card with a subtle drop shadow, stacked with visible gaps on the cream page background. Each card has its own input control and its own 'Visible on profile' checkbox, so several related attributes can be filled in without separate screen transitions per question.

- **Large editorial serif headline replacing a title bar for identity-weighted questions** — *Dating Intentions, Children (status + desire), Religion, Politics single-question screens*
  On screens with one emotionally/identity-loaded question, the top nav is a bare back-chevron with no title text, and the question itself is rendered as a large 3-4 line centered serif headline in the body (e.g. 'Do you have children?', 'What are your religious beliefs?') — a distinct brand voice versus the compact sans-serif title bar used on multi-question card screens.

- **Circular bottom-right "next" button instead of a full-width CTA bar** — *All onboarding detail screens*
  A roughly 64px black filled circle containing a white right-chevron is fixed to the bottom-right corner of the screen and serves as the primary 'next/save' action on every onboarding-detail screen, in place of a full-width bottom button/bar.

- **Split "have children" status from "want children" desire into two separate fields** — *Family/children onboarding*
  Two consecutive single-select screens: 'Do you have children?' (Don't have children / Have children / Prefer not to say) followed by 'Do you want children?' (Don't want children / Want children / Open to children / Not sure yet / Prefer not to say). Same selected-card styling (black outline + taupe fill + filled radio dot) and its own 'Visible on profile' toggle appear on both — current status and future intent are captured as two distinct compatibility signals rather than one combined field.

- **Structured compatibility/lifestyle attribute taxonomy beyond core demographics** — *Onboarding profile-detail flow (religion, politics, lifestyle, education, work, hometown)*
  Concrete field set and control types: Religion — multi-select checkboxes, 'Select all that apply' (Agnostic, Atheist, Buddhist, Catholic, Christian, Hindu, Jewish, Muslim, Sikh, Spiritual, Other, Prefer not to say). Political beliefs — single-select radio (Liberal, Moderate, Conservative, Not political, Other, Prefer not to say). Lifestyle — four separate yes/no-style questions each shown as a horizontal row of pill toggles sized to their label text (Yes / Sometimes / No / Prefer not to say): 'Do you drink?', 'Do you smoke tobacco?', 'Do you smoke weed?', 'Do you use drugs?', each with its own 'Visible on profile' checkbox. Education — freeform 'Where did you study?' (placeholder 'In your own words') plus chip-select 'What's the highest level you attained?' (Secondary school / Bachelor's degree / Postgraduate degree / Prefer not to say). Workplace — freeform 'Where do you work?' and freeform 'What's your job title?' (helper text: 'If you're a student, you're welcome to mention that instead.'). Hometown — freeform 'Where's your home town?' (helper text: 'Totally optional, although people often connect over where someone's from.'). None of this compatibility layer exists in OSThai's current onboarding (name/birthdate/gender/interestedIn/city/country) or its 3-prompt profile structure.

- **"Prefer not to say" paired with an explicit reach-tradeoff warning** — *Sensitive/optional fields (religion, politics, children, dating intentions, education level)*
  The 'Prefer not to say' choice on sensitive fields shows small gray helper text directly beneath it: 'This will limit who sees your profile.' plus an underlined 'Learn more' link — explicitly telling the user that skipping/hiding a compatibility field reduces their discoverability, nudging completion without hard-forcing an answer.

- **Thin horizontal onboarding progress bar** — *Top of every onboarding screen, under the status bar*
  A roughly 3px solid black bar spans a portion of the screen width immediately under the phone status bar, with no percentage or step label, filling left-to-right as the user advances through onboarding — a persistent, low-key sense of how much of the flow remains.

- **structured intent/relationship icon-row fields** — *onboarding profile summary*
  Review card lists each onboarding answer as a stacked white rounded-pill row with a leading circular icon: cake icon+age ('36'), pin icon+current city ('Paris'), house icon+hometown separate from current city ('Paris'), search icon+dating intent ('Long-term relationship'), two-person icon+relationship type ('Monogamy'), and a crown icon+'Job title' that was left blank — shown with an eye-slash icon and lighter/greyed pill to indicate the field is hidden/empty vs the solid-white filled rows. Headline in serif 'You've answered the key questions. Well done!' over a soft sky photo, black pill 'Continue' CTA.

- **multi-photo uploader with per-photo edit + drag reorder** — *photo upload / media editor*
  Stepper header 'Edit media X/6' with back-chevron and a 'Next'/'Done' text button top-right, thin black progress bar; while a photo processes it shows a dim overlay with 'Uploading …' text and a circular spinner centered on the image. Final review screen shows a 2-column grid of up to 6 rounded-corner photo thumbnails, each with a small white circular pencil-icon badge top-right for quick re-edit, and caption text 'Tap to edit: drag to reorder' indicating thumbnails are drag-sortable; headline 'This already feels like you. Nicely done.'; black pill 'Continue'.

- **30-second voice-answer recorder attached to a text prompt** — *onboarding voice prompt*
  After picking a text prompt (shown in a white pill row with pencil-edit icon, e.g. 'Change my mind about'), a dashed-border square zone shows a centered '0:00 / 0:30' timer and placeholder 'Tap to start recording'; a large black circular mic-icon button sits anchored at the bottom edge, half-overlapping the dashed box border; below that an outlined pill '▶ Play sample answer' lets users preview an example clip before recording. 'Skip' pill top-right, headline 'Bring your profile to life with voice'.

- **stat-headline subscription upsell screen** — *post-onboarding paywall pitch*
  Headline 'Subscribers go on 3x as many dates' above a fanned 3-photo stack (center photo enlarged/upright, two side photos peeking out tilted left/right). Below, 4 value-prop rows, each icon+bold title+grey subtitle: sparkle icon 'See compatible people sooner / Find your type faster in Discover'; double-chevron-arrow icon 'Get seen by more daters / We'll show your profile more, automatically'; heart icon 'Priority likes / Your likes stay at the top of their list'; infinity icon 'Send unlimited likes & more …'. Black pill 'Check it out' CTA + plain-text 'Maybe later' dismiss link below it.

- **personalized crossfading headline + empty-state CTA** — *post-onboarding re-engagement nudge*
  Transitional near-blank cream screen shows two overlapping headline texts mid crossfade-animation — a fading-out personalized line 'Off to a great start, Sam.' (uses the user's first name) dissolving into the incoming line 'Add more to your profile to get noticed.' — with a single black pill CTA 'See who's out there' and no other content, used to re-engage users right after onboarding completes.

- **5-tab nav bar with an attention badge on the profile icon** — *global bottom navigation*
  Persistent black bottom bar with 5 icons: brand 'H' logo (Discover/browse, highlighted white when active), outline star (Standouts), outline heart (Likes/Liked-you), speech-bubble (Chats), and the user's own circular avatar photo (Profile) at the far right — with a small solid-red circular badge containing a white '!' overlaid on the avatar's top-right corner specifically to flag an incomplete-profile/action-needed state.

- **horizontal scrollable filter-chip row with a full-filter icon button** — *Discover/browse filter bar*
  Top of Discover has a leading square icon button (stacked horizontal sliders, opens the full filter panel) followed by a horizontally scrollable row of pill-shaped filter chips — 'Signals', 'Age ▾', 'Height ▾', 'Dating In[tentions] ▾' (more scroll off-screen); the currently active chip ('Age') is outlined solid black while inactive chips are light-grey outline; each chip has a dropdown caret for an inline quick-filter popover.

- **algorithm-training coach-mark modal on first like** — *Discover/browse card*
  A white rounded-rect modal overlays the profile card the first time the user is about to like someone: bold serif copy 'See someone you're into? Send a like to help us learn your type.', a thin horizontal divider rule, and a single bare purple/mauve text link 'OK' (bottom-left, no button chrome) to dismiss — frames liking as training the recommendation algorithm to encourage first engagement.

- **per-photo like button at two fixed positions** — *Discover/browse card*
  On a full-bleed profile photo card, a solid white circular heart-icon button is pinned to the photo's top-right corner while a second, smaller dark/translucent circular heart button sits at the bottom-right corner of the same photo — since each photo/section of a multi-photo card can be liked individually, the bottom-right heart button repeats per photo as the user scrolls the card.

- **profile-completion progress ring + percentage badge on avatar** — *profile/settings header ('My Hinge')*
  The circular avatar photo is ringed by a thin progress arc in dark maroon/purple that fills clockwise proportional to completeness, with a small solid-purple pill badge showing the numeric percentage ('57%') overlapping the avatar's bottom edge; a white circular pencil-edit icon sits at the avatar's top-right for quick photo edit; grey subtext 'Incomplete profile' appears under the name. The name row also shows a grey/outline (unfilled) verified-checkmark badge icon next to the first name, always present as a placeholder shape that only colors in once verification is granted.

- **unread/attention dot badges on section tabs** — *profile/settings sub-tabs*
  Three sub-tabs sit under the profile header: 'Get more' (active, black text with black underline), 'Safety' (small solid purple/mauve dot pinned top-right of the label), 'My Hinge' (small solid red dot pinned top-right of the label) — the colored dots flag unread or actionable items within each section, independent of the bottom-nav avatar badge.

- **monetization hub: swipeable subscription ad card + itemized consumable rows with owned-count badges** — *profile/settings 'Get more' tab*
  Top of the tab is a horizontally swipeable dark-photo promo card with a bold wordmark-style headline ('HingeX', styled with a strikethrough treatment on the X), subheadline 'Get noticed sooner and go on 3x as many dates', and a white pill 'Upgrade' button, with the next carousel card's edge peeking on the right. Below it, a vertical list of individual paid-consumable rows, each built as: a colored circular icon (e.g. teal lightning bolt for 'Boost') carrying a small numeric 'owned' badge ('0') on its corner, a bold title ('Boost'), and a grey subtitle ('Get seen by 11x more people'); the next row (cut off, 'Roses') follows the identical row template for a gifting-style consumable.

- **profile-completeness gate on sending/receiving likes** — *Discover/browse gating banner*
  A dimmed banner pinned above the Discover filter bar reads 'Complete your profile to send and receive [likes/messages]…' (text partially cut off) — gates the ability to send/receive likes behind overall profile completeness (not just a minimum photo count), reinforcing the completion-ring nudge elsewhere in the app.

- **Map-based address/area autocomplete picker** — *onboarding – location*
  Full-screen embedded Google Map fills most of the viewport with a black circular 'recenter to current location' FAB (crosshair icon) pinned top-right of the map. Below the map is a single-line text input labeled 'Enter your address, area or postcode'; typing filters a results list (e.g. 'Paris / France' with a right chevron) and selecting a result drops a black teardrop pin on the map labeled with the resolved place name and recenters/zooms the map to it. If the user is zoomed too far out, a black rounded tooltip with a warning triangle icon and a downward-pointing nub reading 'Zoom in to your neighbourhood' overlays the map center. Header copy: serif headline 'Where do you want to meet people?' with grey subtext 'We'll use this to suggest nearby daters. Only the area will appear on your profile.' Confirm via a black circular FAB with a white right-chevron, bottom-right.

- **Full-bleed photo motivational transition before a longer form section** — *onboarding – transition/priming screen*
  A full-bleed lifestyle/candid photo fills the screen with a soft white gradient scrim rising from the bottom third. Over the scrim sits a centered serif headline: "You're about to share more, so your profile can reflect more of you." A single full-width black rounded-pill 'Continue' button sits below it. No form fields on this screen at all — it exists purely to prime/motivate the user before a longer batch of optional profile-detail questions (gender detail, ethnicity, sexuality, relationship type, etc.).

- **Self-referential live profile-card preview with greyed-out teased empty fields** — *onboarding – profile preview*
  Headline 'Here's how some of what you share will appear.' Below it, over a frosted/blurred version of the user's own uploaded photo as background, a stacked white rounded card shows one pill-row per attribute, each with a leading line icon: already-completed fields render as solid white rows with real data (person icon 'Sam', cake/birthday icon '36', pin icon 'Paris'); not-yet-answered upcoming optional fields render as lighter/greyed translucent pill rows with icon + generic label as a teaser (house icon 'Your hometown', magnifying-glass icon 'Connections you're open to', two-people icon 'Your relationship type'). A full-width black 'Continue' pill sits below the card. This shows the user exactly how filled vs. still-empty fields will look on their live profile, incentivizing them to complete more.

- **Radio list with inline 'want to share more' expansion and dynamic reassurance copy** — *onboarding – gender*
  Three full-width rounded-rect option cards (Man/Woman/Non-binary), each with a circular radio control on the right. Selecting one gives that card a black outline and reveals, inside the same card below the label, a dashed-outline pill button '+ Want to share more?' that expands to let the user add nuance (e.g. trans identity) without leaving the primary bucket. Subheading text changes dynamically: before selection it reads 'Choose what describes you best. You can add more detail if you'd like.'; after selecting 'Man' it becomes 'You'll be matched with daters interested in men.' An underlined 'Learn more about how we use gender to recommend people' link sits below the options. A black checkbox row 'Visible on profile' (checked by default) sits above the next-step FAB, letting the user use the field for matching without showing it publicly.

- **Dual scroll-wheel numeric picker with unit toggle; forced-visible attribute** — *onboarding – height*
  Two independent vertical scroll wheels side by side, labeled 'feet' and 'inches': out-of-focus numbers fade to light grey above/below, the selected value is bold black inside a white rounded-rect highlight band centered in the wheel. A centered pill switch below the wheels toggles 'FT | CM' to instantly convert units. At the bottom, instead of a checkbox, an open-eye icon plus the statement 'Always visible on profile' (no toggle) signals this field cannot be hidden — unlike every other attribute screen which offers a visibility choice.

- **Multi-select checklist with a consequence-warning modal on the privacy option** — *onboarding – ethnicity*
  Scrollable 'Select all that apply' checkbox list (Black/African Descent, East Asian, Hispanic/Latino, Middle Eastern, Pacific Islander, South Asian, Southeast Asian, White/Caucasian, Other, Prefer not to say); selected rows get a black-outlined card and a filled black square checkbox with white check. Below the list, a dashed-border expandable '+ Add anything else you'd like someone to know' field, and a footer link 'Wondering why we ask this? Learn more'. Tapping 'Prefer not to say' triggers a bottom-sheet modal over a dimmed background with serif headline '"Prefer not to say" limits who can see your profile' and body copy 'This is a deal-breaker for some people, so your profile will not be shown to them.', dismissed via a single black 'OK' pill — proactively warning the user of the matching consequence of a privacy-protective answer before they commit to it.

- **Character-counted optional free-text field with a coaching tip** — *onboarding – free-text expansion*
  Full-screen text entry reached from any dashed-border '+' expandable field elsewhere in onboarding. Header shows the field name ('Add info') with a 'Done' link top-right. A bordered multi-line textarea auto-focuses with cursor, and a live character counter (e.g. '151') sits bottom-right of the box counting down from a max. Below the textarea, a boxed tip callout with a lightbulb icon reads coaching copy tailored to the field, e.g. 'Your background matters. Share what feels meaningful—if you'd like.' This is one reusable component reused across ethnicity, relationship-type, gender-detail, etc.

- **Progressive-disclosure orientation list plus a taxonomy-feedback link** — *onboarding – sexuality*
  Radio list shows only the four most common options by default (Straight, Gay, Lesbian, Bisexual); a rounded outlined pill 'Show more +' below the list expands to reveal additional, less-common orientation options without cluttering the primary screen. Next to it, an underlined 'Feedback on sexuality?' link invites users to flag if their identity isn't represented — a lightweight in-product feedback channel on a sensitive taxonomy. Same per-field 'Visible on profile' checkbox pattern at the bottom.

- **Matching-only preference field that defaults to hidden from the public profile** — *onboarding – dating preference ('who are you open to dating')*
  A multi-select checkbox list (Men / Women / Non-binary people / Everyone), visually identical in style to the other attribute screens, but distinct from the earlier gender-identity question — this one is used purely to drive who is shown to whom. Uniquely among all the attribute screens observed, its bottom visibility control defaults to 'Hidden on profile' (crossed-out eye icon) rather than 'Visible on profile' — the only field where the default flips to private, and it states this to the user rather than leaving it implicit.

- **Structured monogamy/relationship-structure field with free-text elaboration** — *onboarding – relationship type*
  Multi-select list (Monogamy / Non-monogamy / Figuring out my relationship type) with the same checkbox-card styling as ethnicity/sexuality, plus a dashed-border expandable '+ Share more about what you're looking for, in your own words' free-text add-on, and an underlined 'Learn more about why we've included relationship type options' link addressing why the question exists.

- **Per-attribute public/private visibility control with three distinct states** — *onboarding – all attribute screens (cross-cutting)*
  Nearly every onboarding attribute screen (gender, ethnicity, sexuality, height, dating-preference, relationship type) ends with a small control directly above the next-step button that explicitly names and lets the user set whether that specific data point is shown publicly on the profile vs. used only internally for matching/filtering. Three states were observed on different fields: a togglable black checkbox defaulted ON labeled 'Visible on profile' (gender, ethnicity, sexuality, relationship type); a non-togglable eye-icon statement 'Always visible on profile' (height); and a togglable state defaulted OFF, 'Hidden on profile' with a crossed-eye icon (dating preference). This is a structural, field-by-field privacy model, not a single global profile-visibility switch.

- **profile completion ring + percentage badge** — *profile header (top of Get more/Safety/My Hinge hub)*
  A partial circular progress ring (dark maroon/purple, ~4px stroke) traces around the circular profile photo proportional to completeness; a small pill badge showing the percentage in white-on-purple (e.g. '57%') overlaps the bottom of the photo. Directly under the display name, italic-free grey text reads 'Incomplete profile' whenever the ring isn't full.

- **inline verified badge next to display name** — *profile header*
  A grey circular sunburst/rosette icon with a checkmark sits immediately to the right of the user's first name in the header (e.g. 'Sam [badge]'), rendered in a muted/outlined grey style while unverified. Implies a consistent, reusable badge component shown next to the name across screens, not just a one-off verified tag.

- **3-tab segmented control with red-dot notification** — *profile/account hub*
  Tabs 'Get more | Safety | My Hinge' sit below the profile header, active tab underlined in black. A small solid red dot (~8px) appears just right of the 'My Hinge' label whenever there's an actionable item (e.g. incomplete profile), independent of the push-notification system.

- **Comment Filter toggle for incoming like-comments** — *Safety tab*
  Card labeled 'Comment Filter' / 'Hiding likes containing disrespectful language.' Icon is a purple circle with a crossed-out speech-bubble glyph, overlaid with a small black circle + white checkmark badge in the corner to show it's active. This screens the free-text comment attached to an incoming like (not just match messages) for offensive language and auto-hides it from the recipient.

- **Past Matches review/report screen** — *Safety tab*
  List item 'Past Matches' / 'Review or report a previous match' — the app retains a history of former (unmatched/expired/conversation-ended) matches specifically so a user can go back later and file a report against someone after the match is no longer active.

- **dedicated Block List management screen** — *Safety tab*
  List item 'Block List' / 'Block people you know' — implies a standalone screen for proactively searching for and blocking specific people preemptively (e.g. by name/contact), separate from blocking someone you've already matched with.

- **categorized in-app Safety Center with 2-column article cards** — *Safety tab (scrolled)*
  Content is grouped under icon-labeled section headers ('Personal safety' w/ person-outline icon, 'Community & inclusion' w/ infinity icon, 'Account & privacy' w/ padlock icon). Each section is a 2-up grid of white rounded-rect cards, serif bold headline over grey subtext, linking to specific articles: 'How to report someone on Hinge', 'Protect yourself from scammers', 'Concern about someone else's safety', 'Consequences of false reporting', 'Our guide to obtaining consent', 'Supporting gender diversity', 'Community Guidelines', 'What to do if your account is hacked', 'How we process user interactions', plus a 'Visit the Help Centre for more' card with a black pill 'See all' button.

- **'Complete your profile' nudge card with red alert badge** — *My Hinge tab*
  Centered card: app-logo icon overlaid with a small red circular badge containing a white '!'; headline 'Complete your profile'; subtext 'You're almost there – just a few more details to start matching.'; black-outlined pill button 'Edit profile'. Reusable copy/pattern for a registration-completion nudge.

- **dedicated Standouts icon + avatar alert badge** — *persistent bottom nav bar (5 icons, black background)*
  Icons left-to-right: H logo (home/discover), outlined star (Standouts — curated daily algorithmic picks), outlined heart (likes), speech bubble (chat), and the user's own circular avatar thumbnail on the far right carrying a small red circle+white '!' badge in its top-right corner whenever the profile is incomplete/needs attention.

- **illustrated expert-tips grid** — *My Hinge tab -> 'What Works' hub*
  List entry (lightbulb icon) 'What Works – Check out our expert dating tips' opens a 2x2 grid of rounded-rect tiles. Each tile: white top half with bold headline + one-line description, grey bottom half with a hand-drawn sketch illustration. Tiles: 'Photos – How to pick your best 6 photos', 'Prompts – Show your personality with unique answers', 'Matching – Every match starts with a like – make it count', 'Conversation – Learn how to move your convos to a date.'

- **empty-state illustration with dual CTA incl. premium upsell** — *Matches tab, empty state*
  Full-width whimsical line illustration (person lying in grass among flowers) under headline 'Matches', serif subhead 'Complete your profile to start getting matches', then two stacked full-width pill buttons: solid black 'Edit profile' and a secondary outlined pill with a sparkle icon reading '✨ Upgrade to HingeX'. Shows the premium upsell surfaced even in a zero-content empty state.

- **post-date follow-up prompt** — *Help Center article 'How We Get You Off Hinge'*
  Stated product feature: 'After exchanging phone numbers with a Match, we'll follow up to hear how your date went so we can make better recommendations in the future.' Implies an automated in-app prompt/survey triggered some time after two matched users share phone numbers, asking how the date went, feeding back into matching.

- **structured lifestyle/demographic profile fields beyond prompts** — *Help Center 'What is Hinge?' copy*
  Marketing copy: users 'get to know potential dates through their unique answers to prompts, and personal information like religion, height, and politics' — implying dedicated structured profile fields (not free text) for religion, height, and political leaning shown on every profile.

- **two-tier paid subscription gating 'who liked you' + 'advanced preferences'** — *Help Center monetization FAQ*
  Exact copy: 'The app is free to use. Members who want to see everyone who has liked them and to set advanced preferences may subscribe to a Hinge+ or HingeX membership.' I.e. a partial/limited Liked-You list is free, but seeing every liker AND an advanced filter/preferences panel are paywalled behind two named subscription tiers.

- **dedicated preferences/filter icon separate from settings gear** — *profile/settings header*
  Top-right of the main profile screen shows two icons side by side: a 'sliders' icon (three horizontal lines with circular toggle knobs, representing dating/match preferences) and a separate gear icon (general app settings) — giving one-tap access to filters distinct from account settings.

- **dedicated Age Checks disclosure, separate from identity verification** — *Help Center 'About Hinge' index*
  Article title 'Age Checks at Hinge' listed alongside 'What is Hinge?' and 'Community Guidelines' under an 'About Hinge' section — implies an explicit, separately-documented age-verification policy/process distinct from selfie/identity verification.

- **algorithmic-transparency legal page** — *Help Center 'Policies & Notices' index*
  A dedicated article titled 'Automated Decision-Making and Profiling at Hinge' is listed as its own policy document alongside prohibited-content notices and open-source attributions — a plain-language disclosure of how algorithmic matching/profiling of user data works.

- **help/legal content served in in-app browser with a persistent language switcher** — *Help Center webview chrome*
  Help articles open in an in-app webview (visible browser chrome: close X, dropdown, URL bar, share, translate icon) rather than native screens; every article page pins an 'English (United States) ▾' dropdown language selector at the top next to the 'Help Center' wordmark, implying localized legal/help content per market.

## Full catalog — ThaiFriendly (65)

- **online/last-active badge on grid card** — *browse grid*
  Small solid green circle (~8px) placed immediately to the left of the username text on each browse-grid card, paired with a gray status line under the age/gender/city text reading 'Right Now' or 'Just Now' for very recent activity.

- **online status pill on profile photo** — *profile detail / swipe card*
  Bright green rounded-rectangle pill labeled 'Online' overlaid on the top-left corner of the main profile photo on the full profile/swipe-card view; the same status is repeated as a green 'Online' chip further down in the profile's attribute-chip row.

- **online indicator on message thread row** — *inbox/messages list*
  Thin solid green horizontal bar (~4px) drawn along the bottom edge of the sender's thumbnail photo in the Inbox list to mark that contact as currently online — a visual treatment distinct from the dot/pill used on the grid and profile screens.

- **paywall blur on liker identity ('Upgrade' lock)** — *liked me list*
  For a non-paying user, every card in the 'Liked Me' grid shows the literal bold white word 'Upgrade' in place of the person's username, while their photo stays fully visible; age/city/timestamp still render normally underneath. This is the app's core paid-conversion hook, surfaced directly inside the feature OSThai already has (Liked Me) rather than as a separate paywall page.

- **filter chip row** — *liked me list*
  Row of pill-shaped, blue-outlined toggle buttons directly under the search bar, wrapping to two lines: 'RECENTLY ACTIVE', 'HIDE MESSAGED', 'NEW MEMBERS', 'NEAR ME', 'VERIFIED PHOTOS' — all-caps blue text, blue 1px border, dark/transparent fill, presumably filled solid blue when toggled on.

- **username-only search bar** — *browse grid*
  Rounded dark search field pinned directly under the top toolbar with a magnifying-glass icon and placeholder text 'Username Search' — searches by username only, distinct from the broader 'Search Name / City / Headline' search bar used on the Liked Me screen.

- **grid density toggle** — *browse grid*
  Two adjacent icon buttons in the top toolbar (a plain outline 2x2-tile icon and a filled dense small-tile icon) let the user switch the browse grid between large-tile and compact/dense layouts; the active option is highlighted with a blue-gray background square.

- **'NEW' badge on recently-joined profiles** — *browse grid*
  Small solid-blue rectangular label reading 'NEW' (white bold text) pinned to the bottom-right corner of a card's thumbnail photo, flagging recently-joined profiles directly inside the browse grid rather than requiring a separate 'new members' filter.

- **'MESSAGED YOU' priority ribbon** — *browse grid*
  Full-width solid-red banner reading 'MESSAGED YOU' (white bold caps) overlaid near the bottom of a card's thumbnail photo, above the name/info bar, so people who already reached out to you stand out visually while scrolling the grid.

- **pre-match inline quick-message box** — *profile detail / swipe card*
  Below the main photo on the single-profile card view sits a persistent compose bar: the viewer's own small circular avatar on the left, a text field with placeholder 'Send [Name] a message', and a blue 'Send' button — lets a user message someone directly with no prior mutual like/match required.

- **alternate one-at-a-time card browsing mode** — *profile detail / swipe card*
  A separate lightning-bolt tab in the bottom nav opens a full-screen single-profile view (photo fills the screen, name/age/location overlay at the bottom, dot-progress bar for the multi-photo carousel) with large circular X (pass) and heart (like) buttons below, offered alongside the grid rather than replacing it.

- **likes-count badge in toolbar** — *profile detail / swipe card*
  Outline heart icon in the top-right toolbar of the single-profile card screen carries a small red circular numeral badge (observed value '23'), surfacing a persistent live count tied to likes (unseen received likes or remaining daily quota) while browsing.

- **photo-count nudge copy** — *my profile - photos tab*
  Gray helper box directly under the photo grid reads exactly: 'Upload more photos to get more messages! We recommend at least 6 good photos. Tap and hold a photo then drag to rearrange its position.' — states an explicit target photo count (6) and explains the reorder mechanic inline.

- **drag-and-drop photo reordering + labeled main photo** — *my profile - photos tab*
  Photos can be reordered by press-and-hold then drag within the 2-column photo grid; the first/primary slot carries a permanent semi-transparent dark label bar reading 'Main Photo' across its bottom edge so the user always knows which shot is the lead image.

- **empty photo-slot placeholders** — *my profile - photos tab*
  Unused photo slots (grid holds up to 6, laid out 3-per-row x 2 rows) render as dashed-border rounded rectangles with a solid blue circular '+' button centered in each, rather than being hidden, visually communicating capacity for more photos.

- **structured attribute chip row** — *my profile - preview / details tab*
  Below the bio, a wrapping row of pill-shaped chips shows structured facts with icon prefixes, each independently styled: green 'Online', blue-filled 'Photo Verified' (checkmark icon), plain '190cm', plain '79kg', 🎓 'Masters Degree', 🇨🇦 'From Canada', 🕐 'Joined 1 Year Ago', and 'Looking For Women'.

- **nationality flag emoji beside display name** — *my profile - details tab*
  A national flag emoji (e.g. 🇨🇦) is appended directly after the username in the profile Details-tab header, and repeated as a 'From [Country]' chip further down the page — a trust/origin signal that matters in the Thailand market given the large foreign-resident user base.

- **separate one-line headline above full bio** — *my profile - details tab*
  Profile text is split into two tiers: a short bold headline in large type (e.g. 'French and Canadian gentleman in Thailand looking serious relationship') displayed first, then a smaller full paragraph bio underneath it — distinct fields, not one blob of text, and the headline is what's likely to surface in card previews.

- **in-app 'Liked you' toast banner** — *global overlay (seen on profile screen)*
  A banner overlays the very top of whatever screen is open on top of existing content: a circular avatar thumbnail of the liker on the left, their username in blue, and 'Liked you! 😍' in white text beneath it — a real-time in-app toast distinct from a push notification, persisting over the current page.

- **peeking side-carousel photo viewer** — *my profile - preview tab*
  The main preview photo is shown centered at near-full height while the left/right ~10% strips of the screen show blurred/dimmed edges of the adjacent carousel photos bleeding in from off-screen, with a segmented dot/bar progress indicator directly beneath the photo showing position in the sequence.

- **three-way message triage tabs** — *inbox/messages list*
  Segmented control at the top of the messages screen with three tabs — UNREAD / INBOX / OUTBOX — letting users filter their message list by read status or by sent-vs-received, instead of one flat conversation list.

- **Membership tier shown on own profile card** — *profile drawer / hamburger menu*
  Top of the hamburger side-drawer shows a card with avatar thumbnail, display name, '{age} / {city}' subline, then a bold 'Free Member' label, and below that a 'Photo Verified' pill (blue circular checkmark icon + text on a dark rounded chip). Membership tier and verification status are both surfaced persistently, not just in settings.

- **Persistent upgrade CTA tied to a specific benefit** — *profile drawer footer*
  Sticky full-width blue rounded button pinned at the bottom of the hamburger drawer with two lines: bold 'Upgrade' then smaller 'Get More Messages' underneath — the upsell copy names the concrete limit being removed (messages) rather than a generic 'Go Premium'.

- **Paid message-priority queue jump** — *Premium Options modal*
  Toggle row '✉️ Message Priority' (off by default, white knob/grey track) with copy: 'Your messages will appear at the top of recipients inboxes - ahead of free members messages. This greatly increases your chance of a reply.' A concrete inbox-ranking monetization mechanic.

- **Auto-send templated opener on every like** — *Premium Options modal - Experimental Features*
  🤖 'Auto message likes' toggle. When on, a saved template message auto-fires to anyone liked from browse; an editable text field below is pre-filled with placeholder 'Hi username!' and copy explains 'if username appears in the message it will be replaced with their username.' Different from a per-like custom comment — it's a saved, token-substituted default opener.

- **Per-orientation-pair visibility toggles** — *Privacy Options - Search Control*
  Five independently switchable rows under 'The following groups of people are able to see your profile in search and send you messages': 'Males looking for Females', 'Males looking for Males', 'Females looking for Males', 'Females looking for Females', 'Transgender' — each a labeled row with a blue/grey iOS-style switch. Finer-grained than a single interestedIn field, and explicitly includes a Transgender visibility toggle.

- **'Thailand Users Only' presence filter** — *Privacy Options - Search Control*
  Toggle '🇹🇭 Thailand Users Only' with copy 'Hide your profile from people who aren't in Thailand right now' — hides your profile from anyone not currently located in-country (vs. people who merely list Thailand as an interest). Thailand-market-specific trust/relevance filter.

- **Incognito toggle to exit search results (Premium)** — *Privacy Options - Search Control*
  Yellow rounded 'PREMIUM' pill badge top-right of the card; toggle '🖐️ Show Me in Search' with copy 'Include your profile in the search results.' Lets a paying user browse others while being excluded from everyone else's search/browse results.

- **Viewer-side age-range gating of own visibility (Premium)** — *Privacy Options - Search Control*
  'PREMIUM' pill; toggle '🎯 Apply Age Range' plus a value row 'Age Range: 69+' with a slider — restricts which viewers' ages your profile is shown to (the inverse of a normal 'who I want to see' filter; this filters who can see you).

- **Read-receipt control** — *Privacy Options - Privacy*
  Toggle '📨 Send Read Receipts' (default on) with copy 'Choose if others can know you read the message or not.'

- **Profile-visit tracking with opt-out (Premium)** — *Privacy Options - Privacy*
  'PREMIUM' pill; toggle '👀 Show My Visits' (default on) with copy 'When you visit someones profile they will see that you are looking if this is enabled.' Implies a full 'who viewed your profile' system, corroborated by a matching 'Profile Visits' row in the Notifications settings.

- **'Appear Offline' incognito/ghost mode (Premium)** — *Privacy Options - Privacy*
  'PREMIUM' pill; toggle '👻 Appear Offline' with copy 'When you appear offline your last active time will stop updating.' Directly implies the app normally tracks and surfaces a 'last active' timestamp elsewhere in the UI.

- **Hide account tenure (Premium), paired with a default-visible join-date chip** — *Privacy Options - Privacy*
  'PREMIUM' pill; toggle '📅 Show My Join Date' with copy 'Control if other users can see when you joined.' By default a '⏰ Joined 1 Year Ago' chip is shown directly on the profile detail page as a trust/tenure signal; premium users can hide it.

- **Multiple linked login methods with connect/status indicator** — *Account Settings - App tab*
  'Login Methods' section: each row has a colored status dot — green circle + checkmark for 'Log in with Google' (connected, has its own on/off toggle) vs. orange/red circle + X for 'Log in with Email' (not linked yet, chevron arrow opens setup). Offers a fallback login path independent of the primary method.

- **Pseudonymous username identity, separate from real name** — *throughout (profiles, blocked/hidden lists, drawer)*
  All users are shown app-wide by a chosen handle rather than a real full name (e.g. 'SamuelRose', 'Suda93', 'Lillymichi', 'FERN69558', 'miriTH'), with a dedicated 'Change Username' row in Account settings distinct from any real-name field.

- **3-channel x N-category notification matrix** — *Account Settings - Notifications tab*
  Three separate toggle groups — 'In-App Notifications', 'Push Notifications', 'Emails' — each broken into the same categories ('Profile Visits', 'Interests' [likes], 'Messages'), independently switchable per channel per category (e.g. push Messages on but push Profile Visits off).

- **Inline nudge to re-enable OS push permission** — *Account Settings - Notifications tab*
  When device-level push is off, a centered line reads 'Notifications are disabled in settings.' above a solid blue full-width 'Enable' button that presumably deep-links to system notification settings.

- **Presence-aware email suppression ('Smart Emails')** — *Account Settings - Notifications tab, Emails*
  Toggle 'Smart Emails' with copy 'Smart Emails will mute email notifications while you are using the app. To receive all emails turn off Smart Emails.' Suppresses redundant email pings while the user is actively in-app.

- **Real-time in-app 'Liked you' toast banner** — *global overlay (observed over Settings)*
  A banner overlay appears pinned near the top of the screen — square profile-photo thumbnail on the left, bold blue username, and 'Liked you! 😍' text beneath — surfacing live like events instantly while the user is elsewhere in the app (here shown appearing over the Settings modal), distinct from a system push notification.

- **'Hidden Users' list as a lighter action than Block** — *Account Settings - Privacy tab*
  Segmented control 'BLOCKED USERS' / 'HIDDEN USERS' above a search bar that filters the selected list by username. 'Hidden' is a separate, lower-friction dismissal (remove someone from your browse/search without the block/report weight).

- **Stories-style segmented progress bar on photo carousel** — *profile detail (own and others')*
  A thin horizontal bar made of one segment per photo sits directly over/above the top of the main photo (Instagram-Stories style), filling/advancing to show current position as the user swipes through the profile's photos.

- **Structured attribute-chip row beneath bio text** — *profile detail*
  A wrapped row of small rounded pill chips under the headline/bio, each pairing an emoji + short label: green 'Online' pill, blue '✓ Photo Verified' pill, plus plain chips '190cm', '79kg', '🎓 Masters Degree', '🇨🇦 From Canada', '⏰ Joined 1 Year Ago', 'Looking For Women'. Height, weight, education level, nationality flag, and seeking-gender are all captured as distinct structured fields and rendered as scannable chips, in addition to free-text bio content.

- **High-visibility 'Online' status pill on the profile card** — *profile detail*
  A solid green rounded pill reading 'Online' is the first chip in the attribute row on the profile detail page (not a small dot) — a bold, unmissable live-status implementation.

- **5-icon bottom nav including an unlabeled lightning-bolt icon** — *bottom tab bar*
  Icons left to right: magnifying glass (search/browse), lightning bolt (function not directly shown in these captures, but the icon/position is the app's classic slot for a fast quick-like or boost-type feature), envelope with a red unread-count badge (seen showing '73'), a list/grid icon, and a profile/person icon highlighted blue as the active tab.

- **Always-available in-app feedback channel** — *profile drawer + contextual modal*
  A 'Feedback' row (pencil/speech-bubble icon) sits in the hamburger drawer menu list, and separately a contextual popup was seen overlaying a profile page with prompt text 'How could we improve?', a free-text input box, and two full-width buttons 'Message Us' and 'Close'.

- **Message-anyone CTA (no mutual match required)** — *profile detail*
  A full-width, bright green rounded button reading "Chat with {Name} >" (white bold text, right-facing chevron) sits directly beneath the photo/name header on every profile you view via browsing — not just on mutual matches. Tapping it opens the 1:1 chat thread immediately. This is a structurally different messaging gate than OSThai's mutual-like-required matching: on ThaiFriendly you can initiate contact with any profile at any time (monetized via subscription/credits on the sender side rather than a match-state check).

- **Explicit last-active freshness pill** — *profile detail*
  A gray rounded pill labeled "Last Active {X} Hours/Days Ago" sits immediately to the right of the blue "✓ Photo Verified" pill, in the row of info chips just under the bio card. Value is a coarse human-readable bucket (e.g. "2 Hours Ago", "2 Days Ago"), not a live indicator.

- **Online/last-active status inline in chat header** — *chat / conversation header*
  Directly under the match's name and "{age} / {gender} / {city}" line at the top of the chat screen, small gray text reads "Online {X} days ago" (same freshness-bucket format as the profile page), so the status is visible while messaging, not just while browsing.

- **Three-way action row with a distinct 'star' action** — *profile detail*
  A full-width row of 3 equal dark rounded-square buttons at the bottom of the profile screen: gray X (pass/reject), gray outline heart (like), white outline star (favorite/shortlist) — a third action distinct from the like, functioning like a bookmark/shortlist rather than a rate-limited like.

- **Private notes per profile** — *profile detail*
  Below the stat-chip row, a card titled "Your private notes for {Name}:" contains a multiline text box with placeholder "Enter your private notes here - only you can see them". Notes are saved per-viewed-profile and are never shown to the other person — lets a user jot personal recall cues (where they matched, what was said on a date, red flags) that persist across visits to that profile.

- **Structured demographic/stat chip row** — *profile detail*
  Wrapped row of pill chips beneath the verified/last-active pills: height in cm, weight in kg, "No children", emoji-prefixed education ("🎓 Bachelors Degree"), emoji-prefixed nationality with flag emoji ("🇹🇭From Thailand"), emoji-prefixed account tenure ("⏰ Joined 11 Years Ago"), "Looking For Men", and a free-form self-stated preference chip e.g. "Looking For A Man Younger Than 60". These are structured, filterable-looking fields distinct from OSThai's 3 Hinge-style prompt answers.

- **Dedicated GIF picker button** — *chat composer*
  In the message-input icon row (smiley, GIF, camera, mic, Send), a rectangular blue button with bold white capital letters "GIF" sits second from the left, opening a GIF search/picker for sending animated GIFs in chat.

- **Voice message recording** — *chat composer*
  A microphone icon (blue, outline style) sits in the composer icon row between the camera and Send controls, for recording and sending a voice note directly in the chat thread.

- **Post-send cooldown timer replaces the Send control** — *chat composer*
  The composer's rightmost control normally reads blue bold "Send". Immediately after a message is sent, that same slot switches to a live countdown, e.g. "09:59" (mm:ss, presumably ticking down from 10:00), in place of the Send label — implying a per-message or per-conversation send-pacing/cooldown restriction that's surfaced visually right where Send used to be.

- **Inline per-conversation push opt-in card** — *chat / conversation*
  At the top of a chat thread (above the message history), a centered card reads "Be notified when {Name} replies:" followed by a full-width light-blue rounded button "Allow Notifications", with a plain underlined "Hide" text link beneath to dismiss it. This is a custom pre-permission prompt scoped to one conversation, shown inline in the thread rather than only as a single global OS permission ask.

- **Mini photo strip in chat header** — *chat header*
  To the right of the match's name/age/city block at the very top of the chat screen, 2+ additional thumbnail photos of that match are shown inline (horizontally, tappable), giving quick access to more of their photos without leaving the conversation or opening the full profile.

- **Three-tab mailbox: Unread / Inbox / Outbox** — *inbox / messages list*
  Full-width segmented control at the top of the Messages screen with three equal-width tabs "UNREAD", "INBOX", "OUTBOX" on a dark gray bar; the active tab has a lighter rounded-rectangle background fill. Separates never-opened messages from all received and from sent messages as three distinct lists.

- **Message row with relative-age timestamp + unread badge on nav** — *inbox / messages list*
  Each inbox row: large ~185px square thumbnail on the left, bold name, "{age}, {city}" line, a message-preview snippet that can include emoji (e.g. "Hi 👋"), and a right-aligned relative timestamp ("4 days ago", "1 month ago", "3 months ago", "5 months ago"). The bottom-nav envelope icon carries a red circular badge with the total unread count (observed as high as 71), so unread volume is visible from anywhere in the app.

- **"Main Photo" label overlay on the primary photo tile** — *my profile / photo editor*
  In the 3-column photo-management grid, the first (primary) photo tile has a dark gradient scrim across its bottom edge with bold white text "Main Photo" overlaid directly on the thumbnail, so it's unambiguous which photo is the profile's lead image while managing the grid.

- **Drag-to-reorder photo grid with dashed empty-slot affordance** — *my profile / photo editor*
  3-column photo grid; filled slots show the photo; empty slots render as a dashed-border rounded-rectangle outline with a centered solid blue circular "+" button to add a photo. Helper copy below the grid explicitly states "Tap and hold a photo then drag to rearrange its position."

- **Numeric photo-count coaching nudge tied to outcome** — *my profile / photo editor*
  Persistent gray card under the photo grid: "Upload more photos to get more messages! We recommend at least 6 good photos. Tap and hold a photo then drag to rearrange its position." — ties a specific numeric target (6 photos) directly to a promised outcome (more messages) as an always-visible completion nudge.

- **Peer emoji-reaction badge on an individual photo** — *my profile / photo editor*
  A small emoji sticker (😍 heart-eyes) is rendered pinned to the top-right corner of one specific photo thumbnail inside the owner's own photo-management grid — implying other members can react to a single photo (not just the whole profile) with an emoji, and that reaction is surfaced back to the photo's owner on a per-photo basis.

- **Google Play subscription billing with cross-device Restore Purchases** — *help/FAQ + billing*
  FAQ entry "How do I cancel billing?" instructs: Google Play Store > Menu > Subscriptions > select subscription > "Cancel subscription" (Android IAP, not a web/Stripe checkout). A separate "Multiple devices" FAQ entry explains that if a paid subscription isn't showing on a new device, the user goes to Settings > "Restore Purchases" to re-link the entitlement to their account. Relevant given Thailand's high Android/Google Play usage share and that OSThai has no billing wired up yet at all (single web checkout only).

- **Lightweight 'Flirt'-style interest icon distinct from Like** — *global bottom nav*
  Persistent 5-icon bottom tab bar (search magnifier, lightning bolt, envelope/inbox with unread badge, list/rows icon, profile silhouette). The lightning-bolt icon is a lower-friction, one-tap interest signal separate from the heart/like action seen on profile detail — a cheaper way to flag interest than a full rate-limited like.

- **DETAILS / PHOTOS / PREVIEW tabs with a live self-preview mode** — *my profile edit*
  Profile-edit screen has a 3-segment control ("DETAILS", "PHOTOS", "PREVIEW") directly under the small circular avatar + name + "Photo Verified" pill header. The "PREVIEW" tab renders the profile using the exact same layout other members see on the profile-detail screen, letting a user QA how they'll appear before going live.

