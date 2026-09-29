import { EventsListClient } from "@/components/events/EventsListClient";

export const metadata = {
  title: "Organizer Console | IHI",
  description: "Manage your active hackathons and events.",
};

export default function DashboardPage() {
  return <EventsListClient />;
}