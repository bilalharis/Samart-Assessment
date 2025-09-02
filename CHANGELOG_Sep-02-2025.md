# Smart Assessment Feedback Loop — Updates (Sep 2, 2025)

## Done
- Header controls (Class Avg, Grade, Subject, Select Assessment) now render **only** on:
  - Performance Matrix, Activity Planner, Task Submissions.
- Added `Class Avg` toggle logic (already present) to show/hide **Average Class Performance** pie section.
- **Select Assessment** now shows **chapter-only** labels (e.g., "Chapter 3").
  - If no "Chapter N" is found, it falls back to the last segment of the title (e.g., "Fractions").
- Default assessment on first load prefers **Chapter 1** when available; otherwise selects the first teacher assessment.
- “Lesson Planner” heading changed to **Activity Planner** (UI label was already correct in the tab).

## Files touched
- `src/screens/teacher/TeacherDashboard.tsx`
  - Added helper `getChapterLabel(title)`
  - Updated default-selection `useEffect` to prefer "Chapter 1"
  - Updated `<select>` option labels to use chapter-only text
- `src/screens/teacher/LessonPlanner.tsx`
  - Heading updated to "Activity Planner"

## Notes
- Bottom alignment for header controls uses `items-end` and `self-end` to keep badges/controls aligned.
- All other functionality remains unchanged.
