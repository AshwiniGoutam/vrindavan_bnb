"use client";

import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { DashboardData } from "@/server/services/analytics.service";

const INK = "#1d1c1a";
const PALETTE = ["#1d1c1a", "#a4834e", "#9d8f7b", "#5c5245"];
const rupees = (p: number) => `₹${Math.round(p / 100).toLocaleString("en-IN")}`;
const short = (p: number) => {
  const r = p / 100;
  return r >= 100000 ? `₹${(r / 100000).toFixed(1)}L` : r >= 1000 ? `₹${(r / 1000).toFixed(0)}k` : `₹${r}`;
};
const tooltipStyle = { background: "#f8f6f1", border: "1px solid #d6ccbc", borderRadius: 2, fontSize: 12 };

function Panel({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`border hairline bg-paper p-5 ${className ?? ""}`}>
      <p className="field-label mb-4">{title}</p>
      <div className="h-64">{children}</div>
    </div>
  );
}

export function DashboardCharts({ data, full }: { data: DashboardData; full?: boolean }) {
  const monthly = data.monthly.map((m) => ({ ...m, label: new Date(`${m.month}-01T00:00:00Z`).toLocaleDateString("en-IN", { month: "short", year: "2-digit", timeZone: "UTC" }) }));
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Panel title="Monthly revenue" className="lg:col-span-2">
        <ResponsiveContainer>
          <LineChart data={monthly} margin={{ left: 8, right: 16, top: 8 }}>
            <CartesianGrid stroke="#e8e2d7" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#6f685e" }} axisLine={false} tickLine={false} />
            <YAxis tickFormatter={short} tick={{ fontSize: 11, fill: "#6f685e" }} axisLine={false} tickLine={false} width={56} />
            <Tooltip contentStyle={tooltipStyle} formatter={(v) => rupees(Number(v))} />
            <Line type="monotone" dataKey="revenue" stroke={INK} strokeWidth={1.5} dot={{ r: 2.5, fill: INK }} />
          </LineChart>
        </ResponsiveContainer>
      </Panel>
      <Panel title="Revenue by offering">
        <ResponsiveContainer>
          <PieChart>
            <Pie data={data.byVertical} dataKey="revenue" nameKey="vertical" innerRadius={60} outerRadius={95} paddingAngle={2} stroke="none">
              {data.byVertical.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
            </Pie>
            <Tooltip contentStyle={tooltipStyle} formatter={(v) => rupees(Number(v))} />
          </PieChart>
        </ResponsiveContainer>
      </Panel>
      <Panel title="Bookings by offering">
        <ResponsiveContainer>
          <BarChart data={data.byVertical}>
            <CartesianGrid stroke="#e8e2d7" vertical={false} />
            <XAxis dataKey="vertical" tick={{ fontSize: 11, fill: "#6f685e" }} axisLine={false} tickLine={false} />
            <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#6f685e" }} axisLine={false} tickLine={false} width={32} />
            <Tooltip contentStyle={tooltipStyle} />
            <Bar dataKey="bookings" fill={INK} barSize={28} />
          </BarChart>
        </ResponsiveContainer>
      </Panel>
      {full ? (
        <>
          <Panel title="Bookings by length of stay">
            <ResponsiveContainer>
              <BarChart data={data.byNights}>
                <CartesianGrid stroke="#e8e2d7" vertical={false} />
                <XAxis dataKey="bucket" tick={{ fontSize: 11, fill: "#6f685e" }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#6f685e" }} axisLine={false} tickLine={false} width={32} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="bookings" fill="#a4834e" barSize={28} />
              </BarChart>
            </ResponsiveContainer>
          </Panel>
          <Panel title="Bookings by group size">
            <ResponsiveContainer>
              <BarChart data={data.byGuests}>
                <CartesianGrid stroke="#e8e2d7" vertical={false} />
                <XAxis dataKey="bucket" tick={{ fontSize: 11, fill: "#6f685e" }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#6f685e" }} axisLine={false} tickLine={false} width={32} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="bookings" fill="#9d8f7b" barSize={28} />
              </BarChart>
            </ResponsiveContainer>
          </Panel>
          <Panel title="Funnel" className="lg:col-span-2">
            <ResponsiveContainer>
              <BarChart data={data.funnel} layout="vertical" margin={{ left: 16 }}>
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="stage" tick={{ fontSize: 12, fill: "#1d1c1a" }} axisLine={false} tickLine={false} width={80} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="value" fill={INK} barSize={22} />
              </BarChart>
            </ResponsiveContainer>
          </Panel>
        </>
      ) : null}
    </div>
  );
}
