import { Pipe, PipeTransform } from '@angular/core';

const monthLabels = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

@Pipe({
  name: 'arDate',
})
export class ArDatePipe implements PipeTransform {
  transform(value: string | null | undefined): string {
    if (!value) {
      return '';
    }

    const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/);

    if (!match) {
      return value;
    }

    const [, year, month, day] = match;
    const monthLabel = monthLabels[Number(month) - 1];

    return monthLabel ? `${day}-${monthLabel}-${year}` : value;
  }
}
