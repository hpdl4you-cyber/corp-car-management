"use client";

import { useRouter } from "next/navigation";
import FullCalendar from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import type { DateSelectArg, EventDropArg } from "@fullcalendar/core";
import type { EventResizeDoneArg } from "@fullcalendar/interaction";
import { updateReservationTime } from "@/actions/reservations";

export type CalendarVehicle = {
  id: string;
  title: string;
  colorHex: string;
};

export type CalendarEvent = {
  id: string;
  vehicleId: string;
  title: string;
  start: string;
  end: string;
  colorHex: string;
};

function VehicleCalendar({
  vehicle,
  events,
  initialDate,
  onDateChange,
}: {
  vehicle: CalendarVehicle;
  events: CalendarEvent[];
  initialDate: string;
  onDateChange: (date: string) => void;
}) {
  const router = useRouter();

  const handleSelect = (arg: DateSelectArg) => {
    const params = new URLSearchParams({
      vehicleId: vehicle.id,
      start: arg.startStr,
      end: arg.endStr,
    });
    router.push(`/reservations/new?${params.toString()}`);
  };

  const handleDrop = async (arg: EventDropArg | EventResizeDoneArg) => {
    if (!arg.event.start || !arg.event.end) return;
    try {
      await updateReservationTime({
        id: arg.event.id,
        startAt: arg.event.start,
        endAt: arg.event.end,
      });
      router.refresh();
    } catch (e) {
      alert((e as Error).message);
      arg.revert();
    }
  };

  const vehicleEvents = events
    .filter((e) => e.vehicleId === vehicle.id)
    .map((e) => ({
      id: e.id,
      title: e.title,
      start: e.start,
      end: e.end,
      backgroundColor: e.colorHex,
      borderColor: e.colorHex,
    }));

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      {/* Vehicle header */}
      <div
        className="flex items-center gap-3 px-4 py-3 border-b border-gray-100"
        style={{ borderLeftWidth: 4, borderLeftColor: vehicle.colorHex, borderLeftStyle: "solid" }}
      >
        <div
          className="w-3 h-3 rounded-full flex-shrink-0"
          style={{ backgroundColor: vehicle.colorHex }}
        />
        <span className="font-semibold text-gray-900">{vehicle.title}</span>
        <span className="text-xs text-gray-400 ml-auto">
          {vehicleEvents.length}건 예약
        </span>
      </div>

      {/* Calendar */}
      <div className="p-2">
        <FullCalendar
          plugins={[timeGridPlugin, interactionPlugin]}
          initialView="timeGridWeek"
          initialDate={initialDate}
          locale="ko"
          headerToolbar={{
            left: "prev,next today",
            center: "title",
            right: "",
          }}
          buttonText={{ today: "오늘" }}
          slotDuration="00:30:00"
          snapDuration="00:30:00"
          slotMinTime="06:00:00"
          slotMaxTime="22:00:00"
          allDaySlot={false}
          height="auto"
          nowIndicator
          selectable
          editable
          eventResizableFromStart
          events={vehicleEvents}
          select={handleSelect}
          eventDrop={handleDrop}
          eventResize={handleDrop}
          eventClick={(arg) => router.push(`/reservations/${arg.event.id}`)}
          datesSet={(arg) => onDateChange(arg.startStr)}
        />
      </div>
    </div>
  );
}

export function WeeklyCalendar({
  vehicles,
  events,
}: {
  vehicles: CalendarVehicle[];
  events: CalendarEvent[];
}) {
  // Snap to Monday of current week as the shared initial date
  const d = new Date();
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); // Monday
  const sharedDate = d.toISOString().slice(0, 10);

  // Each VehicleCalendar manages its own date independently (navigated individually).
  // Pass a stable initial date so they all start on the same week.

  if (vehicles.length === 0) {
    return (
      <div className="text-center text-gray-500 py-16 text-sm">
        등록된 차량이 없습니다.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {vehicles.map((vehicle) => (
        <VehicleCalendar
          key={vehicle.id}
          vehicle={vehicle}
          events={events}
          initialDate={sharedDate}
          onDateChange={() => {}}
        />
      ))}
    </div>
  );
}
