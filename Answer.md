# ANSWERS.md

---

## 1. How to run

```bash
git clone https://github.com/your-username/tip-calculator.git
cd tip-calculator
open index.html
```

No installs, no build. Just open the file.

Live at: **https://your-username.github.io/tip-calculator**

---

## 2. Stack & design choices

Went with vanilla HTML/CSS/JS. Honestly for something this contained — one screen, some inputs, some math — pulling in React felt like overkill. There's no routing, no shared state across components, nothing that actually benefits from a framework. Plain JS meant I could just focus on getting the interactions right without fighting a build setup or wondering why a re-render is happening.

Two decisions I thought about more than you'd expect:

**The preset buttons.** I went with visible toggle buttons instead of a dropdown or radio inputs. On mobile especially, opening a dropdown to pick 15% is annoying — you want to tap once and move on. The active preset gets a distinct border + background so it's obvious which one is selected. The custom input and the presets stay in sync — picking a preset writes the value into the input, so there's never a hidden mismatch between "what the button shows" and "what's actually being used."

**Side-by-side layout on desktop.** The output panel sits next to the inputs, not below them. This was deliberate — the whole point of live updates is that you see the number change as you type. If the result is below the fold you lose that entirely. On screens wide enough to support it (≥ 680px), the two panels sit at the same level so you can glance right while typing left. On mobile it stacks, output below inputs, which is fine because you're scrolling anyway.

---

## 3. Responsive & accessibility

**On a 360px phone:** single column, inputs on top, output below. The four preset buttons shrink proportionally — they're in a `repeat(4, 1fr)` grid so they don't wrap. The hero total uses `clamp()` so it scales down instead of clipping. The bill and tip inputs have `inputmode="decimal"` so phones open a number pad, not a full keyboard — keeps the result visible while typing.

**On a 1440px laptop:** two-column layout, max-width capped at 960px so it doesn't stretch too wide. Feels like a proper centered app, not a form floating in empty space.

**Accessibility thing I actually handled:** keyboard nav. You can tab through everything in a sensible order — bill → presets → custom tip → people stepper → reset. The stepper buttons have proper `aria-label` attributes. Error messages use `role="alert"` so a screen reader announces them when they appear without the user having to find them. Focus rings are visible on everything, never hidden.

**Thing I skipped:** the preset buttons probably should be a `<fieldset>` with radio inputs so arrow keys cycle between them natively. I used `<button>` with `aria-pressed` instead, which works but isn't the same. The reason I skipped it — the custom input is conceptually part of the same "tip" group, and mixing radio inputs with a free text field inside a fieldset gets messy to wire up correctly. It's on the list for a proper fix, just didn't want to ship something half-done.

---

## 4. AI usage

I used Claude for two things:

First, I had a dark-themed CSS file and wanted to flip it to a warm vanilla/cream palette. I described the vibe I wanted and it gave me a full set of updated CSS variables. The base palette it suggested was fine, but it kept `--gold-light` as a pale yellow (`#e8c97e`) which worked on the original dark background. On cream that colour basically disappears — contrast was terrible. I changed it to a deep warm brown (`#5a3e1b`) because the hero total is the most important number on screen and it needs to actually read. That's the kind of thing you only catch when you see it in context.

Second, I used it to draft a skeleton for this ANSWERS.md. The structure it gave was too polished and template-y, so I rewrote most of it in my own words. Useful for not staring at a blank file, not useful for the actual content.

---

## 5. Honest gap

The rounding policy first — each person's share rounds **up** to the nearest cent. So if the true split is $12.333…, everyone pays $12.34. The group might pay 1–2 cents more than the exact total, but nobody's short. I'd rather explain "we rounded up a bit" than have someone scrambling to cover a gap at the table. There's a small note in the output when this happens.

What I'd fix with more time: the split breakdown animation. Right now it uses a `max-height` CSS transition to collapse the per-person list, which works but has a slight jump at the end because you can't transition to `height: auto`. The fix is straightforward — read `scrollHeight` in JS, animate to that explicit pixel value, reset to 0 on close — I just didn't get to it. Also the per-person rows just say "Person 1, Person 2" etc. which is fine but being able to type names in would make it actually useful for a real dinner.
