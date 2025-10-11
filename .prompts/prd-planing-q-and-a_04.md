Question: When multiple administrators exist, who is authorized to record the final approved/rejected action for a promotion and how should the system surface which admin recorded it?
Recommendation: Allow any user with the administrator role to record outcomes but require the UI to capture and persist approvedBy/rejectedBy and approvedAt/rejectedAt; display the actor and timestamp on the promotion details for clarity.
Question: Should catalog badges include an explicit pathsAllowed attribute (technical, financial, management) or be implicitly valid for all paths unless restricted?
Recommendation: Add a pathsAllowed field to catalog badges (allowing all), and validate promotions against it so the server can enforce path-scoped counting rules without ambiguous business logic.
Question: If a catalog badge is deactivated while it has accepted instances, can those accepted instances still be used in new promotions (before being used)?
Recommendation: Prevent new applications referencing deactivated catalog badges; keep existing accepted badge instances usable until consumed by an executed promotion, and show a read-only badge catalog entry with deactivatedAt for historic context.
Question: Do you want to support file attachments or external proof URLs on badge applications in MVP, or only free-text reason?
Recommendation: Limit MVP to structured fields plus a free-text reason (no file uploads) to simplify storage and privacy; leave attachment support for a later extension with clear storage and retention rules.
Question: How should the UI present a badge that is already reserved by another promotion draft (what level of detail/link is required)?
Recommendation: Show a modal with the message Badge already assigned to promotion in draft and include a link to the draft promotion and the badge’s current status; offer a refresh and a “view promotion” CTA but no override option.
Question: For promotion submission validation, should the server validate counts by category/level strictly (e.g., 6 silver technical) and reject submissions that don’t exactly match?
Recommendation: Enforce strict server-side validation on submit, returning precise validation errors listing missing counts by category/level, and show the same checks client-side to prevent failed submissions.
Question: Should drafted promotions be autosaved and persisted server-side, or stored locally until the user clicks “save draft”?
Recommendation: Autosave drafts to the server on change (with debouncing) to avoid lost work and enable cross-device editing, but mark drafts clearly as editable and owned by the creator.
Question: When concurrent reservation attempts occur, do you prefer optimistic locking with user-facing conflict messages or strict DB locks that block the second user until the first completes?
Recommendation: Use optimistic reservation with DB uniqueness constraint and meaningful conflict errors (show link to owning draft), since blocking locks harm UX and scale.
Question: Should administrators be allowed to deactivate a catalog badge that is referenced by accepted-but-unused applications, or must they first remove those references?
Recommendation: Allow deactivation but prevent deletion; deactivation should not retroactively invalidate existing accepted instances—those remain valid until used in promotion—and the admin UI should warn if deactivation affects active accepted instances.
Question: Do you require an explicit promotion submission eligibility check in the UI before the user can press Submit (to avoid wasted reviews)?
Recommendation: Implement a real-time eligibility preview that shows which rules are satisfied and which counts are missing, and disable the Submit button until all requirements are met so applicants only submit valid promotions.


1. Allow any user with the administrator role to record outcomes but require the UI to capture and persist approvedBy/rejectedBy and approvedAt/rejectedAt; display the actor and timestamp on the promotion details for clarity.

2.  be implicitly valid for all paths unless restricted by promotion path for specific position

3. Yes

4. No

5. Show a modal with the message Badge already assigned to promotion in draft and include a link to the draft promotion and the badge’s current status; offer a refresh and a “view promotion” CTA but no override option.

6. Yes, exact match is a must

7. "save draft" for MVP

8. Use optimistic reservation with DB uniqueness constraint and meaningful conflict errors (show link to owning draft), since blocking locks harm UX and scale.

9. Yes, deactived badge cannot be used for future badge submitts, but it does not affect existing accepted badges before deactivation.

10. Implement a real-time eligibility preview that shows which rules are satisfied and which counts are missing, and disable the Submit button until all requirements are met so applicants only submit valid promotions.