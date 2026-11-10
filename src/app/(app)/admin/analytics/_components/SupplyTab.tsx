'use client';

import { useState } from 'react';
import { SegmentedControl } from '@/components/molecules/SegmentedControl/SegmentedControl';
import type { Supply } from '@/lib/api/data/adminAnalytics';
import { SUPPLY } from '@/lib/copy/adminAnalytics';
import { formatCount } from '@/lib/utils/format';
import { BarRows, DataTable, Panel, Section, TwoCol } from './parts';
import { rankPlaces, steps } from './tabModels';
import styles from './tabs.module.css';

type Place = 'country' | 'school';

/** Nothing happened: no application in the window and no place with mentees. */
export const isSupplyEmpty = (d: Supply) =>
  d.cohort.applied + d.cohort.approved + d.cohort.listed + d.cohort.bookable === 0 &&
  d.unlisted === 0 &&
  d.byCountry.length === 0 &&
  d.bySchool.length === 0;

/**
 * Supply (Admin Analytics.dc.html `show.supply`): the application cohort to
 * bookable, then demand and supply by country or school. No highlight on a
 * place short of mentors (founder, 9 Nov).
 */
export function SupplyTab({ data }: { data: Supply }) {
  const [by, setBy] = useState<Place>('country');
  const cohort = steps(
    (['applied', 'approved', 'listed', 'bookable'] as const).map((key) => ({
      key,
      value: data.cohort[key],
    })),
  );
  const places = rankPlaces(by === 'country' ? data.byCountry : data.bySchool);
  const days = data.medianReviewDays === null ? null : data.medianReviewDays.toFixed(1);
  return (
    <Section title={SUPPLY.heading} source="db">
      <TwoCol>
        <Panel title={SUPPLY.cohortHeading} note={SUPPLY.cohortNote(days, data.unlisted)}>
          <BarRows
            variant="cohort"
            rows={cohort.map((s) => ({
              key: s.key,
              label: SUPPLY.cohort[s.key],
              width: s.width,
              tip: `${SUPPLY.cohort[s.key]}: ${formatCount(s.value)}`,
              value: (
                <span className={styles.stepValue}>
                  <strong>{formatCount(s.value)}</strong>
                  {s.conversion !== null && <span className={styles.muted}> {s.conversion}%</span>}
                </span>
              ),
            }))}
          />
        </Panel>
        <Panel
          title={SUPPLY.placesHeading}
          note={SUPPLY.placesNote}
          aside={
            <SegmentedControl<Place>
              look="track"
              size="md"
              layout="hug"
              label={SUPPLY.groupBy}
              options={[
                { value: 'country', label: SUPPLY.country },
                { value: 'school', label: SUPPLY.school },
              ]}
              value={by}
              onChange={setBy}
            />
          }
        >
          <DataTable
            label={SUPPLY.placesHeading}
            template="1.2fr 1fr 1fr 1fr"
            columns={[
              by === 'country' ? SUPPLY.country : SUPPLY.school,
              SUPPLY.mentees,
              SUPPLY.bookableMentors,
              SUPPLY.perMentor,
            ]}
            rows={places.map((p) => ({
              key: p.key,
              cells: [
                p.name,
                formatCount(p.mentees),
                formatCount(p.bookableMentors),
                <span key="r" className={styles.strong}>
                  {p.ratio === null ? SUPPLY.noMentors : p.ratio.toFixed(1)}
                </span>,
              ],
            }))}
          />
        </Panel>
      </TwoCol>
    </Section>
  );
}
