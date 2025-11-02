// The purpose of this file is so that we can use these states across many .svelte and .svelte.ts files
// I know it looks stupid, but it's really good for code reusability
import type { Order } from "@data-types/order";

export type StateWrapper<T> = { state: T }
function makeStateWrapper<T>(p: T): StateWrapper<T> {
    return {
        state: p
    }
}

type AnimationState = 'playing'|'paused'|'stopped';


let orderData = $state<StateWrapper<Order[]>>(makeStateWrapper([]));
let cityGeoData = $state<any>(makeStateWrapper(null));
let geography = $state<any>(makeStateWrapper(null));
let countriesLoading = $state<StateWrapper<boolean>>(makeStateWrapper(true));
let selectedCountry = $state<StateWrapper<string>>(makeStateWrapper(''));

let countryFreqs = $state<any>({});
let cityFreqs = $state<StateWrapper<Record<string, Record<string, number>>>>(makeStateWrapper({}));

// these three will likely be used in the form, which we should break into a separate component
let showCircles = $state<StateWrapper<boolean>>(makeStateWrapper(true));
let startDateRaw = $state<StateWrapper<string>>(makeStateWrapper(''));
let endDateRaw = $state<StateWrapper<string>>(makeStateWrapper(''));

// singletons
let dataStartDate = $state<StateWrapper<Date|null>>(makeStateWrapper(null));
let dataEndDate = $state<StateWrapper<Date|null>>(makeStateWrapper(null));

// map elements
let svg = $state<StateWrapper<SVGSVGElement | null>>(makeStateWrapper(null));
let g = $state<StateWrapper<SVGGElement | null>>(makeStateWrapper(null));
let tooltip = $state<StateWrapper<HTMLDivElement | null>>(makeStateWrapper(null));

//animation
let animationDate = $state<StateWrapper<Date>>(makeStateWrapper(new Date()));
let animationTimeframe = $state<StateWrapper<string>>(makeStateWrapper('week'));
let animationPlaying = $state<StateWrapper<AnimationState>>(makeStateWrapper('stopped'));

export {
    orderData,
    cityGeoData,
    geography,
    selectedCountry,
    countriesLoading,
    showCircles,
    startDateRaw,
    endDateRaw,
    g,
    svg,
    tooltip,
    countryFreqs,
    cityFreqs,
    animationDate,
    dataStartDate,
    dataEndDate,
    animationTimeframe,
    animationPlaying,
}