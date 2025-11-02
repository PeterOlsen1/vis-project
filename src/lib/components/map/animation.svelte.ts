import { 
    endDateRaw, 
    startDateRaw, 
    dataEndDate, 
    dataStartDate, 
    animationTimeframe, 
    animationPlaying,
} from "./mapStates.svelte";
import { toHTMLFormat } from "./utils";

let originalStartDate: string|null;
let originalEndDate: string|null;
let interval: NodeJS.Timeout | null;

let animationPaused = false;

const day = 1000 * 60 * 60 * 24;


// TODO:
// fix issue with date timeframe when animation is paused / unpaused
export function startAnimation() {
    // instantiate singletons
    if (originalStartDate == '') {
        console.log('setting singletons');
        originalStartDate = startDateRaw.state;
    }
    if (originalEndDate == '') {
        originalEndDate = endDateRaw.state;
    }

    let startDate = new Date(startDateRaw.state);
    let endDate = new Date(endDateRaw.state);

    if (isNaN(startDate.getTime()) && dataStartDate.state) {
        startDate = dataStartDate.state;
    }
    if (isNaN(endDate.getTime()) && dataEndDate.state) {
        endDate = dataEndDate.state;
    }

    const endDateCpy = new Date(endDate.toString());
    const timeframe = animationTimeframe.state;

    if (timeframe == 'day') {
        endDate.setTime(startDate.getTime() + day);
    } else if (timeframe == 'week') {
        endDate.setTime(startDate.getTime() + day * 7);            
    } else if (timeframe == 'month') {
        endDate.setMonth((startDate.getMonth() + 1) % 12);
    }

    animationPlaying.state = 'playing';
    interval = setInterval(() => {
        if (timeframe == 'day') {
            startDate.setTime(startDate.getTime() + day);
            endDate.setTime(endDate.getTime() + day);
        } else if (timeframe == 'week') {
            startDate.setTime(startDate.getTime() + day * 7);            
            endDate.setTime(endDate.getTime() + day * 7);
        } else if (timeframe == 'month') {
            startDate.setMonth((startDate.getMonth() + 1) % 12);
            endDate.setMonth((endDate.getMonth() + 1) % 12);
        }

        startDateRaw.state = toHTMLFormat(startDate);
        endDateRaw.state = toHTMLFormat(endDate);

        if (startDate > endDateCpy && interval) {
            clearInterval(interval);
            interval = null;
            animationPlaying.state = 'stopped';
        }
    }, 100);
}

// similar to stop animation, but current dates are preserved
export function pauseAnimation() {
    if (interval) {
        clearInterval(interval);
        interval = null;
        animationPaused = true;
    }
    animationPlaying.state = 'paused';
}

export function stopAnimation() {
    if (interval) {
        clearInterval(interval);
        interval = null;
    }
    animationPlaying.state = 'stopped';

    restoreDates();
}

function restoreDates() {
    console.log('originals');
    console.log(originalStartDate, originalEndDate);
    startDateRaw.state = originalStartDate || '';
    endDateRaw.state = originalEndDate || '';

    originalStartDate = '';
    originalEndDate = '';
}
