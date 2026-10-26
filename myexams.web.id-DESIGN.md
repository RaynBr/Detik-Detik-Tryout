---
version: alpha
name: Myexams
description: |
  My Exams presents a modern, tech-forward educational platform with a confident
  and approachable character. The design balances professional utility with
  accessibility, using a predominantly light canvas anchored by a vibrant
  sky-blue primary accent. The visual language emphasizes clarity and
  efficiency, with generous whitespace, straightforward typography, and
  purposeful color blocking. Geometric shadows (hard offset shadows rather than
  soft glows) add subtle depth and a contemporary edge. The overall mood is
  trustworthy yet energetic—suited to an application facilitating high-stakes
  assessments while remaining inviting to its student and educator audience.
source:
  url: "https://myexams.web.id/"
  pagesAnalyzed: 1
  extractedAt: 2026-10-26
  tokensMeasured: true
colors:
  primary: "#38B1ED"
  link: "#5D6371"
  canvas: "#F7F9FC"
  on-primary: "#222222"
  ink: "#000000"
  body: "#161C2D"
  muted: "#BEBEBE"
  hairline: "#C3CCD8"
  accent-1: "#39C0ED"
  accent-2: "#0A2540"
  neutral-1: "#999999"
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 52px
    fontWeight: 700
    lineHeight: 1.38
    letterSpacing: 0px
  display-md:
    fontFamily: Inter
    fontSize: 44px
    fontWeight: 400
    lineHeight: 1.25
    letterSpacing: 0px
  heading-xl:
    fontFamily: Inter
    fontSize: 26px
    fontWeight: 700
    lineHeight: 1.31
    letterSpacing: 0px
  heading-lg:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: 900
    lineHeight: 1.25
    letterSpacing: 0px
  heading-md:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: 500
    lineHeight: 1.56
    letterSpacing: 0px
  heading-md-strong:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: 700
    lineHeight: 1.56
    letterSpacing: 0px
  heading-sm:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: 700
    lineHeight: 1.5
    letterSpacing: 0px
  heading-xs:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: 700
    lineHeight: 1.43
    letterSpacing: 0px
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: 400
    lineHeight: 1.63
    letterSpacing: 0px
  body-lg-loose:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: 400
    lineHeight: 1.7
    letterSpacing: 0px
  body-lg-tight:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: 0px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: 400
    lineHeight: 1.63
    letterSpacing: 0px
  body-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.43
    letterSpacing: 0px
  body-sm-strong:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: 600
    lineHeight: 1.43
    letterSpacing: 0px
  button-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: 0px
  button-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: 700
    lineHeight: 1.38
    letterSpacing: 0px
  caption-xs:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: 500
    lineHeight: 1.33
    letterSpacing: 0px
  caption-xs-strong:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: 700
    lineHeight: 1.33
    letterSpacing: 0px
rounded:
  none: 0px
  xs: 6px
  sm: 12px
spacing:
  xxs: 4px
  xs: 8px
  sm: 12px
  md: 16px
  lg: 20px
  xl: 24px
  xxl: 32px
  xxxl: 40px
  section: 48px
  band: 56px
borderWidths:
  thin: 2px
shadows:
  sm: "rgb(23, 23, 23) 4px 4px 0px 0px"
  md: "rgba(23, 23, 23, 0.976) 3.90097px 3.90097px 0px 0px"
  lg: "rgba(23, 23, 23, 0.024) 0.0990255px 0.0990255px 0px 0px"
  xl: "rgb(23, 23, 23) 3px 3px 0px 0px"
elevationStrategy: layered-micro
themes:
  derived: dark   # the other theme is the site's measured palette
  light:
    bg: "#F7F9FC"
    surface: "#F0F2F4"
    surfaceRaised: "#E6E8EA"
    text: "#000000"
    textMuted: "#161C2D"
    border: "#C3CCD8"
    accent: "#1394D5"
    accentFg: "#000000"
    focusRing: "#38B1ED"
    elevation: shadow
  dark:
    bg: "#0B1014"
    surface: "#1A1E22"
    surfaceRaised: "#262A2E"
    text: "#F7FCFE"
    textMuted: "#9DA2A5"
    border: "#32363A"
    accent: "#38B1ED"
    accentFg: "#0B0B0C"
    focusRing: "#38B1ED"
    elevation: "border+surface"
gradients:
  - context: section
    kind: linear
    value: "linear-gradient(to right, oklch(0.585 0.233 277.117) 0%, oklch(0.585 0.233 277.117) 100%)"
components:
  button-primary:
    typography: "{typography.heading-xs}"
    textColor: "rgb(255, 255, 255)"
    border: "2px solid oklch(0.21 0.034 264.665)"
    height: 40px
    boxShadow: "rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgb(23, 23, 23) 3px 3px 0px 0px"
    rounded: "{rounded.sm}"
    backgroundColor: "{colors.primary}"
  button-outline:
    typography: "{typography.heading-xs}"
    textColor: "rgb(255, 255, 255)"
    border: "2px solid oklch(0.21 0.034 264.665)"
    height: 40px
    padding: "8px 12px 8px 12px"
    boxShadow: "rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgb(23, 23, 23) 2px 2px 0px 0px"
    rounded: 8px
    backgroundColor: "oklch(0.673 0.182 276.935)"
  card:
    typography: "{typography.button-md}"
    textColor: "{colors.ink}"
    border: "2px solid oklch(0.21 0.034 264.665)"
    padding: "24px 24px 24px 24px"
    boxShadow: "rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(23, 23, 23, 0.996) 3.97737px 3.97737px 0px 0px"
    rounded: "{rounded.sm}"
    backgroundColor: "rgb(254, 255, 255)"
  card-sm:
    typography: "{typography.button-md}"
    textColor: "{colors.ink}"
    border: "2px solid oklch(0.21 0.034 264.665)"
    padding: "24px 24px 24px 24px"
    boxShadow: "rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(23, 23, 23, 0.004) 0.0226257px 0.0226257px 0px 0px"
    rounded: "{rounded.sm}"
    backgroundColor: "rgb(57, 177, 237)"
  footer:
    typography: "{typography.body-sm}"
    textColor: "{colors.ink}"
    padding: "80px 0px 0px 0px"
    backgroundColor: "rgb(255, 255, 255)"
  link:
    typography: "{typography.button-md}"
    textColor: "{colors.ink}"
    border: "2px solid oklch(0.21 0.034 264.665)"
    padding: "32px 32px 32px 32px"
    boxShadow: "rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgb(23, 23, 23) 5px 5px 0px 0px"
    rounded: 16px
    backgroundColor: "{colors.accent-2}"
  link-sm:
    typography: "{typography.button-md}"
    textColor: "rgb(255, 255, 255)"
    border: "2px solid oklch(0.21 0.034 264.665)"
    boxShadow: "rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgb(23, 23, 23) 3px 3px 0px 0px"
    rounded: "{rounded.sm}"
    backgroundColor: "rgb(37, 211, 102)"
states:
  other-hover:
    target: other
    state: hover
    opacity: 0
  other-focus:
    target: other
    state: focus
    borderColor: "{colors.primary}"
  other-focus-visible:
    target: other
    state: focus-visible
    outlineWidth: 2px
  other-disabled:
    target: other
    state: disabled
    opacity: 0.6
  link-hover:
    target: link
    state: hover
    textColor: "{colors.primary}"
breakpoints:
  - width: 375
    containerWidth: 343
    gridColumns: 2
    navLinksVisible: 0
    menuToggleVisible: true
    headingPx: 30
    bodyPx: 16
    sectionPaddingX: 16
  - width: 768
    containerWidth: 704
    gridColumns: 4
    navLinksVisible: 0
    menuToggleVisible: true
    headingPx: 44
    bodyPx: 16
    sectionPaddingX: 32
  - width: 1024
    containerWidth: 960
    gridColumns: 4
    navLinksVisible: 0
    menuToggleVisible: false
    headingPx: 51
    bodyPx: 16
    sectionPaddingX: 32
  - width: 1280
    containerWidth: 1152
    gridColumns: 5
    navLinksVisible: 0
    menuToggleVisible: false
    headingPx: 52
    bodyPx: 16
    sectionPaddingX: 32
  - width: 1440
    containerWidth: 1280
    gridColumns: 4
    navLinksVisible: 0
    menuToggleVisible: false
    headingPx: 52
    bodyPx: 16
    sectionPaddingX: 32
coverage:
  statesFound: 31
  gradientsFound: 1
  rolesUnassigned: 3
  archetypesUnnamed: 0
  archetypesDetected: 0
  responsiveMeasured: true
  stylesheetsBlocked: false
  semanticRampDeclared: false
---

# Design System Inspired by My Exams

## 1. Visual Theme & Atmosphere

My Exams presents a modern, tech-forward educational platform with a confident and approachable character. The design balances professional utility with accessibility, using a predominantly light canvas anchored by a vibrant sky-blue primary accent. The visual language emphasizes clarity and efficiency, with generous whitespace, straightforward typography, and purposeful color blocking. Geometric shadows (hard offset shadows rather than soft glows) add subtle depth and a contemporary edge. The overall mood is trustworthy yet energetic—suited to an application facilitating high-stakes assessments while remaining inviting to its student and educator audience.

**Key Characteristics**
- Light, airy canvas with strong geometric contrast
- Primary accent of bright cyan-blue drives all call-to-action surfaces
- Hard-edged offset shadows (2–5px displacement) create layered depth
- Inter typeface throughout, with generous hierarchy and clear visual rhythm
- Rounded corners (12px) soften geometric precision without losing modernity
- Purposeful use of decorative cyan and navy accents for visual texture
- Text-heavy and information-dense layouts balanced by clean spacing

## 2. Color Palette & Roles

### Primary
- **Primary / Brand** (`{colors.primary}` — `#38B1ED`): Primary call-to-action buttons, brand mark, active states, and interactive highlights. Core accent throughout the platform.

### Accent Colors
- **Decorative Accent 1** (`{colors.accent-1}` — `#39C0ED`): Companion cyan tone for subtle visual variety; no declared functional role—used ornamentally.
- **Decorative Accent 2** (`{colors.accent-2}` — `#0A2540`): Deep navy accent; no declared functional role—reserved for decorative surfaces or dark overlays.

### Interactive
- **Link** (`{colors.link}` — `#5D6371`): Inline and standalone link color; subtle gray-blue for secondary navigation.

### Neutral Scale
- **Canvas** (`{colors.canvas}` — `#F7F9FC`): Default page background; very light blue-gray, almost white.
- **Ink** (`{colors.ink}` — `#000000`): Primary headings and highest-contrast text elements.
- **Body** (`{colors.body}` — `#161C2D`): Body copy and primary reading text; near-black with slight blue undertone.
- **Muted** (`{colors.muted}` — `#BEBEBE`): Captions, secondary text, and de-emphasized labels.
- **On Primary** (`{colors.on-primary}` — `#222222`): Labels and text rendered on primary-colored surfaces; ensures legibility over the brand blue.

### Surface & Borders
- **Hairline** (`{colors.hairline}` — `#C3CCD8`): 1px borders, dividers, and subtle edge definition; light gray used across cards and containers.
- **Neutral** (`{colors.neutral-1}` — `#999999`): Additional neutral tone for secondary borders and structural elements.

## 3. Typography Rules

### Font Family
**Primary:** Inter
**Fallback:** system-ui, -apple-system, sans-serif

### Hierarchy
| Role | Font | Size | Weight | Line Height | Letter Spacing | Notes |
|---|---|---|---|---|---|---|
| Display Large | Inter | 52px | 700 | 1.38 | 0px | Hero heading; maximum visual impact. |
| Display Medium | Inter | 44px | 400 | 1.25 | 0px | Section intro; large and prominent. |
| Heading Extra Large | Inter | 26px | 700 | 1.31 | 0px | Feature section titles. |
| Heading Large | Inter | 24px | 900 | 1.25 | 0px | Subsection headings; maximum weight. |
| Heading Medium | Inter | 18px | 500 | 1.56 | 0px | Card titles and mid-level headings. |
| Heading Medium Strong | Inter | 18px | 700 | 1.56 | 0px | Emphasized heading variant. |
| Heading Small | Inter | 16px | 700 | 1.5 | 0px | Component labels and compact headings. |
| Heading Extra Small | Inter | 14px | 700 | 1.43 | 0px | Small heading and badge text. |
| Body Large Loose | Inter | 18px | 400 | 1.7 | 0px | Body copy with extra line height for readability. |
| Body Large | Inter | 18px | 400 | 1.63 | 0px | Generous body copy. |
| Body Large Tight | Inter | 18px | 400 | 1.5 | 0px | Compact body text with reduced line height. |
| Body Medium | Inter | 16px | 400 | 1.63 | 0px | Standard body and description text. |
| Body Small Strong | Inter | 14px | 600 | 1.43 | 0px | Inline link text and emphasized small copy. |
| Body Small | Inter | 14px | 400 | 1.43 | 0px | Fine print and secondary text. |
| Button Medium | Inter | 16px | 400 | 1.5 | 0px | Medium button labels. |
| Button Small | Inter | 14px | 700 | 1.38 | 0px | Compact button text; bold weight. |
| Caption Extra Small Strong | Inter | 12px | 700 | 1.33 | 0px | Emphasized captions and labels. |
| Caption Extra Small | Inter | 12px | 500 | 1.33 | 0px | Fine captions and metadata. |

### Principles
- Single typeface (Inter) throughout ensures cohesion and reduces cognitive load.
- Hierarchy relies on size, weight, and line height rather than color shifts.
- Body text defaults to loose line height (1.63–1.7) for accessibility and readability.
- Headings employ weight contrast: 400 for introductory display, 700–900 for emphasis.
- All letter-spacing is 0px; the Inter family requires no additional tracking.

## 4. Component Stylings

### Buttons

#### Primary Button
- **Background:** `{colors.primary}` (`#38B1ED`)
- **Text Color:** `#FFFFFF` (white)
- **Padding:** `{spacing.none}` (`0px`)
- **Height:** `40px`
- **Width:** `160px`
- **Font:** `{typography.button-sm}` (14px, weight 700, line-height 1.38)
- **Border:** `2px solid` `#030810` (near-black border)
- **Border Radius:** `{rounded.sm}` (`12px`)
- **Box Shadow:** `rgb(23, 23, 23) 3px 3px 0px 0px` (hard offset shadow)

#### Outline Button
- **Background:** Gradient blue (`oklch(0.673 0.182 276.935)`)
- **Text Color:** `#FFFFFF` (white)
- **Padding:** `{spacing.xs}` (`8px`) vertical, `{spacing.sm}` (`12px`) horizontal
- **Height:** `40px`
- **Width:** `118.188px` (content-fit)
- **Font:** `{typography.button-sm}` (14px, weight 700, line-height 1.38)
- **Border:** `2px solid` `#030810` (near-black border)
- **Border Radius:** `{rounded.xs}` (`8px`)
- **Box Shadow:** `rgb(23, 23, 23) 2px 2px 0px 0px` (hard offset shadow, shorter displacement)

### Cards & Containers

#### Default Card
- **Background:** `#FEFFFF` (near-white)
- **Text Color:** `{colors.ink}` (`#000000`)
- **Padding:** `{spacing.xl}` (`24px`) on all sides
- **Width:** `232px`
- **Height:** `318.875px`
- **Font:** `{typography.body-md}` (16px, weight 400, line-height 1.63)
- **Border:** `2px solid` `#030810` (near-black)
- **Border Radius:** `{rounded.sm}` (`12px`)
- **Box Shadow:** `rgba(23, 23, 23, 0.996) 3.97737px 3.97737px 0px 0px` (prominent hard shadow)

#### Default Card Small
- **Background:** `{colors.primary}` (`#39C0ED`)
- **Text Color:** `{colors.ink}` (`#000000`)
- **Padding:** `{spacing.xl}` (`24px`) on all sides
- **Width:** `232px`
- **Height:** `290.875px`
- **Font:** `{typography.body-md}` (16px, weight 400, line-height 1.63)
- **Border:** `2px solid` `#030810` (near-black)
- **Border Radius:** `{rounded.sm}` (`12px`)
- **Box Shadow:** `rgba(23, 23, 23, 0.004) 0.0226257px 0.0226257px 0px 0px` (minimal shadow)

### Inputs & Forms

#### Navigation Links
- **Text Color:** `{colors.link}` (`#5D6371`)
- **Font:** `{typography.body-sm-strong}` (14px, weight 600, line-height 1.43)
- **Hover State:** Color shifts to `rgb(56, 177, 237)` (primary blue)
- **Focus State:** Border color becomes `rgb(56, 177, 237)`; outline width `2px`
- **Active State:** Typically underlined or filled with primary color

#### Text Input / Form Field
- **Border:** `2px solid` `{colors.hairline}` (`#C3CCD8`)
- **Border Radius:** `{rounded.xs}` (`6px`)
- **Padding:** `{spacing.md}` (`16px`) vertical, `{spacing.md}` (`16px`) horizontal (typical)
- **Font:** `{typography.body-md}` (16px, weight 400, line-height 1.63)
- **Focus State:** Border color becomes `rgb(56, 177, 237)`; outline width `2px`
- **Disabled State:** Opacity `0.6`

### Navigation

#### Header Navigation
- **Background:** `{colors.canvas}` (`#F7F9FC`)
- **Text Color:** `{colors.body}` (`#161C2D`)
- **Border:** `2px solid` near-black (top/bottom as shown)
- **Border Radius:** `0px` (sharp corners on header bar)
- **Padding:** `{spacing.md}` (`16px`) vertical, `{spacing.md}` (`16px`) horizontal
- **Font:** `{typography.body-sm-strong}` (14px, weight 600, line-height 1.43)
- **Hover State on Links:** Color becomes `rgb(56, 177, 237)` (primary blue)

#### Mobile Menu Toggle
- Visible at `375px`–`1024px` breakpoints
- **Background:** `{colors.primary}` (`#38B1ED`)
- **Size:** `40px` × `40px` (typical)
- **Border Radius:** `{rounded.sm}` (`12px`)

### Footer

#### Footer Container
- **Background:** `#FFFFFF` (white)
- **Text Color:** `{colors.body}` (`#161C2D`)
- **Font:** `{typography.body-sm}` (14px, weight 400, line-height 1.43)
- **Padding Top:** `{spacing.xxxl}` (`80px`)
- **Padding Bottom:** `{spacing.band}` (`56px`)
- **Border:** None
- **Box Shadow:** None

## 5. Layout Principles

### Spacing System
Base unit: `{spacing.xs}` (`8px`)

Multiples in use:
- `{spacing.xxs}` = `4px` (micro spacing, rarely used)
- `{spacing.xs}` = `8px` (tight component padding)
- `{spacing.sm}` = `12px` (compact spacing)
- `{spacing.md}` = `16px` (default element padding)
- `{spacing.lg}` = `20px` (generous component spacing)
- `{spacing.xl}` = `24px` (card and section padding)
- `{spacing.xxl}` = `32px` (large section margins)
- `{spacing.xxxl}` = `40px` (footer and major layout padding)
- `{spacing.section}` = `48px` (section dividers)
- `{spacing.band}` = `56px` (full-width band spacing)

**Usage Context:**
- Inline element padding: `{spacing.xs}` to `{spacing.sm}`
- Card/container padding: `{spacing.xl}` (`24px`)
- Section margin-top/bottom: `{spacing.section}` (`48px`) to `{spacing.band}` (`56px`)
- Whitespace between major sections: `{spacing.band}` (`56px`)

### Grid & Container
- **Max Width:** `1280px` (primary content container at `1440px` viewport)
- **Column Strategy:** 4-column grid at `1024px` and above; 2-column at `375px`–`768px`
- **Section Padding (Horizontal):** `{spacing.md}` (`16px`) on mobile; `{spacing.xl}` (`32px`) on tablet/desktop
- **Content Column Width (1440px):** `1280px`

### Whitespace Philosophy
The system prioritizes breathing room and visual clarity. Large sections are separated by `{spacing.band}` (`56px`), while related elements within a section use `{spacing.lg}` to `{spacing.xxl}` (`20px`–`32px`). Cards and containers employ consistent `{spacing.xl}` (`24px`) internal padding. This creates a rhythm that prevents cognitive overload and establishes clear information hierarchy without relying on color noise.

### Border Radius Scale
- `{rounded.none}` = `0px` — Images and full-width components; sharp corners.
- `{rounded.xs}` = `6px` — Subtle rounding on form inputs and small badges.
- `{rounded.sm}` = `12px` — Primary rounding for buttons, cards, and major interactive elements.

**Component Contexts:**
- **Buttons:** `{rounded.sm}` (`12px`) primary; `{rounded.xs}` (`6px`) outline
- **Cards:** `{rounded.sm}` (`12px`)
- **Badges:** `{rounded.sm}` (`12px`)
- **Input Fields:** `{rounded.xs}` (`6px`)
- **Images:** `{rounded.none}` (`0px`)

### Border Widths
- **Thin:** `2px` — Applied to all buttons, cards, and borders throughout. This consistent stroke creates a bold, confident frame around interactive and structural elements.

## 6. Depth & Elevation

| Level | Treatment | Use |
|---|---|---|
| Flat | No shadow | Text, icons, and background elements |
| Micro (Shadow SM) | `rgb(23, 23, 23) 4px 4px 0px 0px` | Subtle lift for secondary cards |
| Micro (Shadow MD) | `rgba(23, 23, 23, 0.976) 3.90097px 3.90097px 0px 0px` | Light card elevation |
| Micro (Shadow LG) | `rgba(23, 23, 23, 0.024) 0.0990255px 0.0990255px 0px 0px` | Barely perceptible depth |
| Prominent (Shadow XL) | `rgb(23, 23, 23) 3px 3px 0px 0px` | Primary buttons and featured cards |

**Shadow Philosophy:**
The design system uses hard-edged offset shadows rather than soft blur-based shadows, creating a contemporary, geometric aesthetic. Shadows are displaced `2px`–`5px` in both x and y, rendered in near-black (`rgb(23, 23, 23)`). This approach provides depth without softness, reinforcing the tech-forward, structured character of the platform. Shadow opacity is calibrated: prominent elements (buttons, hero cards) use `rgb(23, 23, 23)` at near 100%, while background cards employ opacity values down to 0.004 for subtlety.

### Opacity Levels
- **90%** (`0.90`) — Primary opacity for visible, interactive elements
- **75%** (`0.75`) — Secondary surfaces and supporting elements
- **61%** (`0.61`) — Muted or de-emphasized content
- **50%** (`0.50`) — Hover or transition states; medium intensity overlays
- **28%** (`0.28`) — Subtle backgrounds and secondary overlays
- **2%** (`0.02`) — Minimal shadow or border opacity for cards in focus

### Z-index / Layering
- **Base:** `1` — Default page content
- **Base+1:** `2` — Slightly elevated components (cards over background)
- **Base+2:** `3` — Secondary elevation (modals, toasts approaching)
- **Dropdown:** `10` — Floating menus and popover elements
- **Dropdown+1:** `30` — Higher-priority dropdowns or secondary overlays
- **Dropdown+2:** `40` — Top-level dropdowns, modals, and sticky headers

## 7. Do's and Don'ts

### Do
- Use the primary brand color (`{colors.primary}` — `#38B1ED`) consistently for all primary call-to-action buttons and interactive highlights.
- Maintain the `2px` border on all major components (buttons, cards, inputs) to reinforce the confident, defined aesthetic.
- Apply hard offset shadows (2px–5px displacement in near-black) to create depth; never use soft gaussian blur shadows.
- Set button and card border-radius to `{rounded.sm}` (`12px`) for modern softness without losing geometric precision.
- Use `{colors.canvas}` (`#F7F9FC`) as the page background to maintain the light, airy quality.
- Keep typography clean and hierarchy-driven; rely on size and weight changes, not color shifts.
- Apply `{spacing.xl}` (`24px`) padding consistently inside cards and containers.
- Separate major sections with `{spacing.band}` (`56px`) margin to create clear visual rhythm.
- Use the full Inter font family across all text; avoid system font fallbacks unless necessary.

### Don't
- Do not use soft shadows (gaussian blur) anywhere; hard offset shadows are the system standard.
- Do not apply border-radius outside the published scale (`0px`, `6px`, `12px`).
- Do not exceed `2px` stroke width on borders unless creating a heavy accent line.
- Do not reduce card padding below `{spacing.xl}` (`24px`); this is the system minimum for internal spacing.
- Do not introduce new accent colors; the palette is closed and intentional.
- Do not override link hover color; it must become `rgb(56, 177, 237)` on interaction.
- Do not use high-contrast black (`#000000`) for body text; prefer `{colors.body}` (`#161C2D`) for readability.
- Do not apply opacity to text directly; adjust color instead for better legibility.
- Do not increase section padding below `{spacing.section}` (`48px`) horizontally; the grid depends on this minimum.

## 8. Responsive Behavior

### Breakpoints
| Name | Width | Content Column | Columns | Nav Links Visible | Menu Toggle | Largest Heading | Section Padding-X |
|---|---|---|---|---|---|---|---|
| Mobile Small | 375px | 343px | 2 | No | Yes | 30px | 16px |
| Tablet | 768px | 704px | 4 | No | Yes | 44px | 32px |
| Desktop | 1024px | 960px | 4 | No | No | 51px | 32px |
| Desktop Large | 1280px | 1152px | 5 | No | No | 52px | 32px |
| Desktop Extra Large | 1440px | 1280px | 4 | No | No | 52px | 32px |

**Key Observations:**
- Nav links are not visible on any measured breakpoint; a mobile menu toggle appears at all sizes up to `1024px`.
- Heading sizes scale from `30px` (mobile) to `52px` (desktop large), indicating a responsive scale.
- Section padding is `16px` on mobile, `32px` on tablet/desktop—doubling for visual breathing room.
- Content column grows from `343px` to `1280px`, but always respects container margins.

### Touch Targets
- **Minimum Interactive Element Size:** `40px` × `40px` (buttons, menu toggles, form controls)
- **Button Height Standard:** `40px` (primary and outline buttons)
- **Link Padding (Text):** Minimum `{spacing.sm}` (`12px`) horizontal, `{spacing.xs}` (`8px`) vertical
- **Card Minimum Width:** `232px` (measured on fixed-width card layouts)

### Collapsing Strategy
- At mobile (`375px`), layout shifts to 2-column grid; section padding reduces to `16px` horizontally.
- Display headings scale down from `52px` (desktop) to `30px` (mobile) to fit narrower viewports.
- Navigation becomes a hamburger menu toggle (visible at all breakpoints up to `1024px`).
- Card widths remain fixed at `232px`; multiple columns stack vertically on smaller screens.
- Button widths adapt: primary buttons hold `160px` width, outline buttons flex to content width.
- Footer maintains full-width layout but adjusts internal padding: `{spacing.xxxl}` (`80px`) top, `{spacing.band}` (`56px`) bottom on desktop, reduced on mobile.

## 9. Agent Prompt Guide

### Quick Color Reference
- **Primary CTA:** Primary / Brand (`{colors.primary}` — `#38B1ED`)
- **Background (Canvas):** Canvas (`{colors.canvas}` — `#F7F9FC`)
- **Heading Text:** Ink (`{colors.ink}` — `#000000`)
- **Body Text:** Body (`{colors.body}` — `#161C2D`)
- **Links:** Link (`{colors.link}` — `#5D6371`)
- **Borders (1px):** Hairline (`{colors.hairline}` — `#C3CCD8`)
- **Secondary Text:** Muted (`{colors.muted}` — `#BEBEBE`)
- **Decorative Cyan:** Accent 1 (`{colors.accent-1}` — `#39C0ED`)
- **Decorative Navy:** Accent 2 (`{colors.accent-2}` — `#0A2540`)
- **Text on Primary Surfaces:** On Primary (`{colors.on-primary}` — `#222222`)

### Iteration Guide
1. **All interactive elements (buttons, cards, inputs) must have a `2px` border** in near-black (`#030810` or `rgb(23, 23, 23)`). No borderless components.
2. **Hard offset shadows only:** Displace shadows `2px`–`5px` in x and y; never use blur. Shadow color: `rgb(23, 23, 23)` at varying opacity.
3. **Button border-radius:** Primary buttons use `{rounded.sm}` (`12px`); outline variants use `{rounded.xs}` (`6px`).
4. **Card and container padding:** Always `{spacing.xl}` (`24px`) on all sides minimum.
5. **Section spacing:** Separate major sections with `{spacing.band}` (`56px`) margin-top/bottom.
6. **Typography:** Use Inter exclusively. Establish hierarchy via size and weight, not color. Line height ranges from 1.25 (tight display) to 1.7 (loose body).
7. **Responsive:** Headings scale by viewport; section padding is `16px` mobile, `32px` desktop. Grid is 2-column mobile, 4–5-column desktop.
8. **Focus states:** Links and inputs receive a `2px` outline in `rgb(56, 177, 237)` (primary blue).
9. **Hover states:** Links and text change color to `rgb(56, 177, 237)`; buttons may lighten or darken slightly within the blue family.
10. **Z-index:** Sticky navigation and dropdowns live in the `10`–`40` range; keep base content at `1`–`3`.

## 10. Known Gaps

- **Semantic Status Colors:** The site does not declare error, success, or warning color roles in its publicly accessible markup. No semantic color ramp (red/green/amber) is available; only implement status colors if explicitly requested or if new design tokens are provided.
- **Interaction States:** The extraction identified hover, focus, focus-visible, active, and disabled states from stylesheets, but their exact visual effect on non-button components (dropdowns, modals, form groups) was not fully captured. Assume standard browser defaults for unseen interactions.
- **Dark Mode / Theme Variants:** Only a single light theme was measured. No dark mode CSS or theme tokens were discovered; the site does not appear to publish a dark variant.
- **Unassigned Accent Colors:** 3 colors were extracted but have no measured functional role: `{colors.accent-1}` (`#39C0ED`) and `{colors.accent-2}` (`#0A2540`). These are described as decorative; do not invent a semantic purpose for them.
- **Authenticated Surfaces:** Only the public landing page and feature sections were analyzed. Dashboards, user settings, exam interfaces, and admin panels (visible in mockup screenshots but not fully live on the public site) may have distinct component patterns or additional color roles not captured here.
- **Micro-interactions & Animation:** No CSS animation, transition, or keyframe data was extracted. Timing, easing, and motion behavior are not documented.
- **Accessibility Attributes:** ARIA labels, role declarations, and high-contrast mode support were not measured. Assume WCAG 2.1 AA compliance is required but verify against actual implementation.
- **Icon Library:** No icon set or icon sizing scale was formally defined in the extraction; inline icons are mentioned but their specific dimensions and styling are not documented.

---

**Extracted at:** 2025
**Brand:** My Exams CBT
**Coverage:** 1 publicly accessible page(s); authenticated regions not analyzed