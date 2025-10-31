import { endDateRaw, startDateRaw, dataEndDate, dataStartDate } from "./mapStates.svelte";

let originalStartDate: string|null;
let originalEndDate: string|null;
let interval: NodeJS.Timeout | null;

export function startAnimation() {
    if (!originalStartDate) {
        originalStartDate = startDateRaw.state;
    }
    if (!originalEndDate) {
        originalEndDate = endDateRaw.state;
    }

    console.log('animation started!!!');
    let startDate = new Date(startDateRaw.state);
    let endDate = new Date(endDateRaw.state);

    if (isNaN(startDate.getTime()) && dataStartDate.state) {
        startDate = dataStartDate.state;
    }
    if (isNaN(endDate.getTime()) && dataEndDate.state) {
        endDate = dataEndDate.state;
    }

    const step = (endDate.getTime() - startDate.getTime()) / 50;

    interval = setInterval(() => {
        startDate.setTime(startDate.getTime() + step);
        startDateRaw.state = startDate.toISOString();

        if (startDate > endDate && interval) {
            clearInterval(interval);
            interval = null;
            restoreDates();
        }
    }, 100);
}

export function stopAnimation() {
    if (interval) {
        clearInterval(interval);
        interval = null;
    }

    restoreDates();
}

function restoreDates() {
    console.log('originals');
    console.log(originalStartDate, originalEndDate);
    startDateRaw.state = originalStartDate;
    endDateRaw.state = originalEndDate;
}