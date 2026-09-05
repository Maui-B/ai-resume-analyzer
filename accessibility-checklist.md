# Landing Page Accessibility Audit Checklist

## Keyboard Navigation
- [ ] All interactive elements (button, input) are focusable with Tab
- [ ] Focus order follows visual layout
- [ ] No keyboard traps
- [ ] Visible focus indicator on all interactive elements

## Screen Reader Compatibility
- [ ] All buttons have descriptive aria-labels
- [ ] Form inputs have associated labels (using `for` attribute)
- [ ] Semantic HTML structure (h1, p, div with roles as needed)
- [ ] No ARIA attributes used incorrectly

## Color & Contrast
- [ ] Text meets WCAG 2.1 AA contrast ratio (4.5:1 for normal text)
- [ ] Color is not the only means of conveying information
- [ ] Interactive elements have sufficient color contrast when focused

## Other
- [ ] All images have appropriate alt text (og-image.png has alt="AI Resume Analyzer logo")
- [ ] Page title is descriptive and unique
- [ ] No flashing or blinking content
- [ ] Page loads without JavaScript (basic structure remains usable)

## Testing Tools
- [ ] Test with VoiceOver (macOS) or Narrator (Windows)
- [ ] Test with keyboard only
- [ ] Validate with axe DevTools or WAVE
- [ ] Validate contrast with Color Contrast Analyzer