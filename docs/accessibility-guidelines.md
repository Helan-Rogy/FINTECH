# Accessibility Guidelines — FinTech AI Platform

## Objective

Ensure the platform is usable and understandable for low-literacy users, first-time financial service customers, and users unfamiliar with technical financial terminology.

---

## 1. Language Principles

### Plain Language Rules
- **Use short sentences.** Maximum 20 words per sentence in simplified mode.
- **Avoid jargon.** Do not use terms like "false positive", "model inference", or "feature weight" in user-facing copy.
- **Use active voice.** Write "Our system flagged your transaction" not "Your transaction was flagged by the system."
- **Explain numbers in context.** Do not just show `78%` — say "78 out of 100, which is high risk."
- **One idea per sentence.** Never combine two explanations in a single sentence in simplified mode.

### Terminology Glossary (Simplified Definitions)

| Technical Term       | Plain Language Equivalent                                           |
|----------------------|---------------------------------------------------------------------|
| Fraud score          | How suspicious a transaction looks (0 = safe, 100 = very suspicious)|
| Risk score           | How likely you are to have trouble repaying a loan (0 = safe, 100 = high concern)|
| Flagged              | Marked for a human to check                                         |
| High risk            | Needs urgent attention from an analyst                              |
| Escalated            | Sent to a senior team for a closer look                             |
| Reason code          | A short label explaining why something was flagged                  |
| Case                 | A flagged transaction waiting for a human decision                  |
| Velocity             | How many transactions happened in a short time                      |
| Geo mismatch         | Payments from two very different locations at the same time         |
| Confidence           | How sure the system is about its score                              |

---

## 2. UI Accessibility Standards

### Visual Design
- All text must meet **WCAG AA contrast ratio** (minimum 4.5:1 for normal text, 3:1 for large text).
- Never rely on colour alone to convey meaning — always pair colour with an icon or label.
- Score bands must show both colour AND label (e.g., "HIGH RISK" in red, not just a red badge).
- Use `aria-label` and `role` attributes on all interactive components.

### Simplified View Toggle
- Every score result page must offer a **"Show simplified view"** toggle.
- Simplified view replaces all technical output with:
  - One large status indicator (Safe / Needs Review / Action Needed)
  - A plain-language sentence explaining what the score means
  - A simple progress bar showing the level (Low / Medium / High)
  - A clear "What to do next" action list

### Font & Size
- Minimum body font size: **14px**
- Simplified mode headings: **18px** minimum
- Line height: **1.6** for all body copy in simplified mode
- Avoid all-caps text longer than 4 words

---

## 3. Accessibility Assistant

### Purpose
A floating chat assistant is available on all user-facing pages. It answers questions in plain language about:
- What fraud and risk scores mean
- Why a transaction was flagged
- What to do after receiving a high-risk result
- How to dispute a decision

### API Contract
`POST /api/accessibility/explain`

**Request:**
```json
{
  "question": "Why was my transaction flagged?",
  "context_type": "fraud" | "risk" | "general",
  "context_data": { ... }  // optional: current result data for context-aware answers
}
```

**Response:**
```json
{
  "answer": "Your transaction was flagged because...",
  "source": "faq" | "context" | "fallback",
  "question": "Why was my transaction flagged?"
}
```

### Answer Sources
| Source    | Description                                                        |
|-----------|--------------------------------------------------------------------|
| `faq`     | Matched a pre-written FAQ answer                                   |
| `context` | Generated a personalised explanation using the current result data |
| `fallback`| Keyword-based general response when no match is found              |

### Response Length
- Keep all assistant answers under **100 words**.
- Use simple sentences, no bullet points in chat responses.
- Always end context-aware responses with a clear call to action.

---

## 4. Voice Interface Placeholder

A voice toggle is reserved in the UI for future voice input/output integration. Implementation notes:
- The UI toggle is present but inactive until a TTS/STT provider is configured.
- Recommended future integration: Web Speech API or a third-party service like ElevenLabs.
- All assistant responses are already structured as short, spoken-friendly sentences.

---

## 5. Testing Checklist

Before each release, verify:
- [ ] Simplified view toggle renders correctly on Fraud Check and Risk Score pages
- [ ] Assistant responds to all 10 FAQ topics without errors
- [ ] Context-aware explanations generate correctly for low, medium, and high bands
- [ ] All score badges display both colour and text label
- [ ] All interactive elements have `aria-label` attributes
- [ ] Form inputs have matching `<label>` elements
- [ ] Contrast ratios pass WCAG AA on all text/background combinations
- [ ] Assistant chat is keyboard-navigable (Tab, Enter, Escape)

---

## 6. Supported Languages (Future)

Phase 7 delivers English only. The following languages are planned for future phases:
- isiZulu
- Afrikaans
- Sesotho
- Setswana

All API responses use structured data so that translations can be applied at the response layer without backend changes.
