# Account security

Every authenticated role can open **My Profile & Account Security** by selecting the account name in the header, or visiting `/profile`. Gym Settings also links to this screen.

Changing a password requires the current password and a matching new password containing at least 8 characters, uppercase, lowercase, a digit and a special character. Success is shown only after the server updates the password. Password changes are audited and clear the saved refresh token.

Newly provisioned owners, staff and trainers must change their temporary password. Password reset provisioning also uses the existing `mustChangePassword` flag. The protected route renders the password form before dashboard components mount. The API independently rejects business requests while this flag is set, allowing profile lookup, password change and logout. Completing the change opens the dashboard (SaaS console for Super Admin).

This release does not reset existing clients' passwords or retroactively force users who already chose a private password.

Verification: 65 backend tests, 5 frontend tests and TypeScript checks passed. Both live tenant profile routes were checked. Master and executive monthly collection totals were reconciled against tenant-scoped database payment sums. Dashboard transaction dates and payment statuses are consistent; peak attendance is calculated from recorded IST check-ins.

This verification does not certify every screen or hardware integration. Inbox delivery, physical biometric devices and full browser journeys remain separate checks.
