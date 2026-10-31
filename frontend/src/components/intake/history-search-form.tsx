'use client';

import { CalendarBlank } from '@phosphor-icons/react';
import { format, isValid, parseISO } from 'date-fns';
import { enUS, zhCN } from 'date-fns/locale';
import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Form } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useLocale, useT } from '@/lib/i18n/i18n-provider';

function parseDate(value: string) {
  const date = parseISO(value);
  return isValid(date) ? date : undefined;
}

export function HistorySearchForm({
  query,
  from,
  to,
  hasFilters,
  onApply,
  onReset,
}: {
  query: string;
  from: string;
  to: string;
  hasFilters: boolean;
  onApply: (values: Record<string, string>) => void;
  onReset: () => void;
}) {
  const t = useT();
  const [title, setTitle] = useState(query);
  const [start, setStart] = useState(() => parseDate(from));
  const [end, setEnd] = useState(() => parseDate(to));
  return (
    <Form
      onSubmit={(event) => {
        event.preventDefault();
        onApply({
          q: title,
          from: start ? format(start, 'yyyy-MM-dd') : '',
          to: end ? format(end, 'yyyy-MM-dd') : '',
        });
      }}
    >
      <FieldGroup className="grid grid-cols-2 items-end gap-3 lg:grid-cols-[minmax(0,2fr)_repeat(2,minmax(0,1fr))_auto]">
        <Field className="col-span-2 min-w-0 lg:col-span-1">
          <FieldLabel htmlFor="history-title">
            {t('chrome.historyTitle')}
          </FieldLabel>
          <Input
            id="history-title"
            name="q"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            maxLength={100}
            placeholder={t('chrome.historyTitlePlaceholder')}
          />
        </Field>
        <HistoryDatePicker
          id="history-from"
          label={t('chrome.startDate')}
          value={start}
          onChange={(date) => {
            setStart(date);
            if (date && end && end < date) setEnd(undefined);
          }}
        />
        <HistoryDatePicker
          id="history-to"
          label={t('chrome.endDate')}
          value={end}
          min={start}
          onChange={setEnd}
        />
        <div className="col-span-2 flex gap-2 lg:col-span-1">
          <Button type="submit" variant="outline">
            {t('chrome.filter')}
          </Button>
          {hasFilters ? (
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setTitle('');
                setStart(undefined);
                setEnd(undefined);
                onReset();
              }}
            >
              {t('chrome.clearFilters')}
            </Button>
          ) : null}
        </div>
      </FieldGroup>
    </Form>
  );
}

function HistoryDatePicker({
  id,
  label,
  value,
  min,
  onChange,
}: {
  id: string;
  label: string;
  value: Date | undefined;
  min?: Date;
  onChange: (value: Date | undefined) => void;
}) {
  const locale = useLocale();
  const t = useT();
  const [open, setOpen] = useState(false);
  const dateLocale = locale === 'en-US' ? enUS : zhCN;
  const dateLabelFormatter = useMemo(
    () => new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }),
    [locale],
  );
  const formatted = value
    ? dateLabelFormatter.format(value)
    : t('chrome.pickDate');
  return (
    <Field className="min-w-0">
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            id={id}
            type="button"
            variant="outline"
            className="w-full justify-start"
            aria-label={t(
              value ? 'chrome.dateField' : 'chrome.dateFieldEmpty',
              { label, value: formatted },
            )}
          >
            <CalendarBlank aria-hidden data-icon="inline-start" />
            {formatted}
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-auto" aria-label={label}>
          <Calendar
            locale={dateLocale}
            mode="single"
            fixedWeeks
            defaultMonth={value ?? min}
            selected={value}
            disabled={min ? { before: min } : undefined}
            onSelect={(date) => {
              onChange(date);
              setOpen(false);
            }}
            autoFocus
          />
          <Button
            type="button"
            variant="ghost"
            disabled={!value}
            onClick={() => {
              onChange(undefined);
              setOpen(false);
            }}
          >
            {t('chrome.clearDate')}
          </Button>
        </PopoverContent>
      </Popover>
    </Field>
  );
}
