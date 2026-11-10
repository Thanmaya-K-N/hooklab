import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Layout } from "./components/Layout.js";
import { OverviewPage } from "./pages/OverviewPage.js";
import { EndpointsPage } from "./pages/EndpointsPage.js";
import { EventsPage } from "./pages/EventsPage.js";
import { EventDetailPage } from "./pages/EventDetailPage.js";
import { DeliveriesPage } from "./pages/DeliveriesPage.js";
import { DeliveryDetailPage } from "./pages/DeliveryDetailPage.js";
import { SettingsPage } from "./pages/SettingsPage.js";

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<OverviewPage />} />
          <Route path="endpoints" element={<EndpointsPage />} />
          <Route path="events" element={<EventsPage />} />
          <Route path="events/:id" element={<EventDetailPage />} />
          <Route path="deliveries" element={<DeliveriesPage />} />
          <Route path="deliveries/:id" element={<DeliveryDetailPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
