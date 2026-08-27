# Leon OS V6 — Native iOS

This folder is the clean native rewrite of Leon OS. The existing web app remains untouched on `main`.

## Product principle

Leon OS should not be a dashboard the user has to maintain. It should understand context, turn natural language into structured constraints, and decide what is worth doing next.

## First vertical slice

1. User tells OS their afternoon in normal German.
2. OS extracts hard constraints such as arrival, meals, departure and appointments.
3. PlanningEngine finds the real free window.
4. A study block is inserted only when it actually fits.
5. Home shows one clear Next Move and the resulting timeline.

Example:

> Um 15 Uhr komme ich von der Schule zurück, von 15 bis 15:30 esse ich, um 16 Uhr treffe ich Freunde und muss um 15:45 los. Ich kann noch 15 Minuten lernen.

Expected structure:
- 15:00–15:30 Essen
- 15:30–15:45 Lernen
- 15:45 los
- 16:00 Freunde

## Architecture

- SwiftUI native client
- deterministic PlanningEngine for time math
- ContextEngine for current/relevant state
- LocalScheduleInterpreter for the first offline slice
- OS service boundary prepared for an AI backend
- Learning model prepared for topics, mastery and future PROVE IT sessions

The AI is not allowed to invent successful actions. Structured changes must be returned and applied by app tools/engines.

## Open in Xcode

The project is described with XcodeGen (`project.yml`) so the source stays readable in Git.

On a Mac:

```bash
brew install xcodegen
cd ios/LeonOS
xcodegen generate
open LeonOS.xcodeproj
```

Target: iOS 17+
