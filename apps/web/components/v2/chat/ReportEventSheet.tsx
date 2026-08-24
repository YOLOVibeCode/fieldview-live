'use client';

import { useEffect, useMemo, useState } from 'react';
import { sportRegistry, type EventCategory, type IEventDetailOption } from '@fieldview/data-model';
import { BottomSheet } from '@/components/v2/primitives/BottomSheet';
import { SportEventIcon } from '@/components/v2/scoreboard/SportEventIcon';
import type { ReportDetail } from './Chat';

export interface ReportEventSheetProps {
  isOpen: boolean;
  onClose: () => void;
  sportId: string;
  homeTeamName: string;
  awayTeamName: string;
  onReport: (eventTypeId: string, team?: 'home' | 'away', detail?: ReportDetail) => void;
  category?: EventCategory;
  preselectedTeam?: 'home' | 'away';
}

type Step = 'pick-event' | 'pick-team' | 'add-detail';

export function ReportEventSheet({
  isOpen,
  onClose,
  sportId,
  homeTeamName,
  awayTeamName,
  onReport,
  category,
  preselectedTeam,
}: ReportEventSheetProps) {
  const sport = useMemo(() => {
    try {
      return sportRegistry.getSport(sportId);
    } catch {
      return sportRegistry.getSport('generic');
    }
  }, [sportId]);

  const events = useMemo(
    () => (category ? sport.eventTypes.filter((e) => e.category === category) : sport.eventTypes),
    [sport, category]
  );

  const [step, setStep] = useState<Step>('pick-event');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pendingTeam, setPendingTeam] = useState<'home' | 'away' | undefined>(undefined);

  // Detail fields
  const [jerseyNumber, setJerseyNumber] = useState<string>('');
  const [selectedDetail, setSelectedDetail] = useState<string | null>(null);
  const [detailValue, setDetailValue] = useState<string>('');
  const [note, setNote] = useState<string>('');

  const selected = events.find((e) => e.id === selectedId) ?? null;
  const detailOptions: readonly IEventDetailOption[] = selected?.detailOptions ?? [];
  const activeDetailOpt = detailOptions.find((d) => d.id === selectedDetail) ?? null;

  useEffect(() => {
    if (!isOpen) {
      setStep('pick-event');
      setSelectedId(null);
      setPendingTeam(undefined);
      setJerseyNumber('');
      setSelectedDetail(null);
      setDetailValue('');
      setNote('');
    }
  }, [isOpen]);

  const title = (() => {
    if (step === 'pick-team' && selected) return `Who scored? ${selected.label}`;
    if (step === 'add-detail' && selected) return `Add detail (optional)`;
    if (category === 'scoring' && preselectedTeam) {
      return `Report for ${preselectedTeam === 'home' ? homeTeamName : awayTeamName}`;
    }
    if (category === 'period') return `Report ${sport.displayName} period`;
    if (category === 'hype') return `Report ${sport.displayName} highlight`;
    return `Report ${sport.displayName} event`;
  })();

  const buildDetail = (): ReportDetail | undefined => {
    const num = jerseyNumber.trim() !== '' ? parseInt(jerseyNumber, 10) : undefined;
    const val = detailValue.trim() !== '' ? parseInt(detailValue, 10) : undefined;
    const n = note.trim() || undefined;
    const d = selectedDetail ?? undefined;
    if (num === undefined && d === undefined && val === undefined && n === undefined) return undefined;
    return {
      jerseyNumber: num,
      detail: d,
      detailValue: val,
      note: n,
    };
  };

  const submit = (team?: 'home' | 'away') => {
    if (!selected) return;
    onReport(selected.id, team, buildDetail());
    onClose();
  };

  const pickEvent = (eventTypeId: string, teamScoped: boolean) => {
    const et = events.find((e) => e.id === eventTypeId);
    const hasDetails = et?.detailOptions && et.detailOptions.length > 0;

    if (!teamScoped) {
      if (hasDetails) {
        setSelectedId(eventTypeId);
        setStep('add-detail');
        return;
      }
      onReport(eventTypeId);
      onClose();
      return;
    }

    if (preselectedTeam) {
      if (hasDetails) {
        setSelectedId(eventTypeId);
        setPendingTeam(preselectedTeam);
        setStep('add-detail');
        return;
      }
      onReport(eventTypeId, preselectedTeam);
      onClose();
      return;
    }

    setSelectedId(eventTypeId);
    setStep('pick-team');
  };

  const afterTeamPick = (team: 'home' | 'away') => {
    if (!selected) return;
    if (selected.detailOptions && selected.detailOptions.length > 0) {
      setPendingTeam(team);
      setStep('add-detail');
      return;
    }
    submit(team);
  };

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} aria-labelledby="report-event-title">
      <div className="p-4" data-testid="modal-report-event">
        <h2 id="report-event-title" className="text-lg font-semibold text-white mb-3">
          {title}
        </h2>

        {/* Step 1: Pick event type */}
        {step === 'pick-event' && (
          <div className="grid grid-cols-2 gap-2">
            {events.map((et) => (
              <button
                key={et.id}
                type="button"
                data-testid={`btn-event-type-${et.id}`}
                onClick={() => pickEvent(et.id, et.teamScoped)}
                className="flex items-start gap-2 rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-left text-sm text-white hover:bg-white/10"
              >
                <SportEventIcon
                  name={et.icon}
                  className="mt-0.5 h-4 w-4 shrink-0"
                  data-testid={`icon-event-${et.id}`}
                />
                <span>
                  <span className="font-medium">{et.label}</span>
                  <span className="mt-0.5 block text-[10px] uppercase text-white/50">{et.category}</span>
                </span>
              </button>
            ))}
          </div>
        )}

        {/* Step 2: Pick team (when no preselected team) */}
        {step === 'pick-team' && selected && (
          <div data-testid="report-team-picker">
            <p className="text-sm text-white/80 mb-3">Who? {selected.label}</p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                data-testid="btn-report-team-home"
                onClick={() => afterTeamPick('home')}
                className="rounded-lg bg-blue-700 px-3 py-3 text-white font-semibold"
              >
                {homeTeamName}
              </button>
              <button
                type="button"
                data-testid="btn-report-team-away"
                onClick={() => afterTeamPick('away')}
                className="rounded-lg bg-red-700 px-3 py-3 text-white font-semibold"
              >
                {awayTeamName}
              </button>
            </div>
            <button
              type="button"
              className="mt-3 text-xs text-white/60"
              data-testid="btn-back-to-events"
              onClick={() => setStep('pick-event')}
            >
              Back
            </button>
          </div>
        )}

        {/* Step 3: Optional detail */}
        {step === 'add-detail' && selected && (
          <div data-testid="report-detail-step">
            {/* Jersey number */}
            <div className="mb-3">
              <label htmlFor="input-jersey" className="text-xs text-white/60 mb-1 block">
                Jersey # (optional)
              </label>
              <input
                id="input-jersey"
                type="number"
                min={0}
                max={99}
                inputMode="numeric"
                data-testid="input-jersey-number"
                value={jerseyNumber}
                onChange={(e) => setJerseyNumber(e.target.value)}
                placeholder="00"
                className="w-20 rounded-md border border-white/20 bg-white/10 px-2 py-1.5 text-center text-lg text-white placeholder:text-white/30 focus:outline-none"
                aria-label="Jersey number"
              />
            </div>

            {/* Detail chips */}
            {detailOptions.length > 0 && (
              <div className="mb-3">
                <p className="text-xs text-white/60 mb-1">How? (optional)</p>
                <div className="flex flex-wrap gap-1.5" data-testid="detail-chips">
                  {detailOptions.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      data-testid={`chip-detail-${opt.id}`}
                      onClick={() => setSelectedDetail(selectedDetail === opt.id ? null : opt.id)}
                      className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                        selectedDetail === opt.id
                          ? 'border-amber-400 bg-amber-400/20 text-amber-200'
                          : 'border-white/20 bg-white/5 text-white/80 hover:bg-white/10'
                      }`}
                      aria-pressed={selectedDetail === opt.id}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>

                {/* Yards/unit input when detail is selected and has unit */}
                {activeDetailOpt?.unit === 'yards' && (
                  <div className="mt-2">
                    <label htmlFor="input-detail-value" className="text-xs text-white/60 mb-1 block">
                      Yards (optional)
                    </label>
                    <input
                      id="input-detail-value"
                      type="number"
                      min={0}
                      inputMode="numeric"
                      data-testid="input-detail-value"
                      value={detailValue}
                      onChange={(e) => setDetailValue(e.target.value)}
                      placeholder="0"
                      className="w-24 rounded-md border border-white/20 bg-white/10 px-2 py-1.5 text-center text-white placeholder:text-white/30 focus:outline-none"
                      aria-label="Yards"
                    />
                  </div>
                )}
              </div>
            )}

            {/* Note */}
            <div className="mb-4">
              <label htmlFor="input-note" className="text-xs text-white/60 mb-1 block">
                Note (optional, max 80 chars)
              </label>
              <input
                id="input-note"
                type="text"
                maxLength={80}
                data-testid="input-note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Add a note…"
                className="w-full rounded-md border border-white/20 bg-white/10 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none"
                aria-label="Optional note"
                aria-describedby="note-char-count"
              />
              <span
                id="note-char-count"
                data-testid="note-char-count"
                className="mt-0.5 block text-right text-[10px] text-white/40"
              >
                {note.length}/80
              </span>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                data-testid="btn-report-with-detail"
                onClick={() => submit(pendingTeam)}
                className="flex-1 rounded-lg bg-amber-500 px-3 py-3 text-sm font-semibold text-black"
              >
                Report
              </button>
              <button
                type="button"
                data-testid="btn-skip-detail"
                onClick={() => {
                  setJerseyNumber('');
                  setSelectedDetail(null);
                  setDetailValue('');
                  setNote('');
                  onReport(selected.id, pendingTeam);
                  onClose();
                }}
                className="rounded-lg border border-white/20 px-3 py-3 text-sm text-white/60 hover:bg-white/5"
              >
                Skip
              </button>
            </div>

            <button
              type="button"
              data-testid="btn-back-from-detail"
              className="mt-3 text-xs text-white/60"
              onClick={() => {
                if (!selected.teamScoped || preselectedTeam) {
                  setStep('pick-event');
                } else {
                  setStep('pick-team');
                }
              }}
            >
              Back
            </button>
          </div>
        )}
      </div>
    </BottomSheet>
  );
}
