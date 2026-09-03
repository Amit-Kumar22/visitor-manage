// Shared between the client-side form/dashboard and the server-side model +
// API routes, so it's kept dependency-free (no mongoose) and safe to import
// from client components.
export const VISITOR_PURPOSES = [
  "Meeting",
  "Interview",
  "Delivery",
  "Personal",
  "Vendor",
  "Other",
];
