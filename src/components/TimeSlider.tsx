import React, { useEffect, useRef, useState } from 'react';
import { css, cx } from '@emotion/css';
import { DataHoverClearEvent, DataHoverEvent, DataHoverPayload, EventBus, FieldType, getValueFormatterIndex, ValueFormatter } from '@grafana/data';
import { TimeSeriesData } from 'components/TimeSeries';
import { TimeSliderMode } from 'types';
import { isArray } from 'lodash';

export interface TimeSliderProps {
  animControl: any,
  styles: any;
  tsData: TimeSeriesData;
  setLabel: React.Dispatch<React.SetStateAction<string | undefined>>;
  label: string | undefined;
  timeZone: string;
  timeSliderScalarRef: React.MutableRefObject<number>;
  enabled: boolean;
  mode: TimeSliderMode;
  eventBus: EventBus;
  windowWidth: number;
  timeSlideShowControl: any;
  timeSlideShowIsPlayingContentRef: React.MutableRefObject<boolean>;
  timeSliderPlayIntervalMs: number;
  timeSlideShowSteps: number;
}

type TimeSliderState = {
  formatter: ValueFormatter;
  panelId: string;
  range: number;
  setTimeValue: React.Dispatch<React.SetStateAction<number>>;
};

type DataHoverPayloadFlowPanel = DataHoverPayload & {
  flowPanel: {
    id: string;
    time: number;
    position: number;
  };
};

let gPanelIdCallCount = 0;

export const sliderTime = (tsData: any, sliderScalar: number) => {
  const time = Math.ceil(tsData.timeMin + (tsData.timeRange * sliderScalar));
  return time;
}

const handleOnChange = (props: TimeSliderProps, state: TimeSliderState, event: any) => {
  const sliderScalar = event.target.value / state.range;
  const time = sliderTime(props.tsData, sliderScalar);
  props.timeSliderScalarRef.current = sliderScalar;
  props.setLabel(state.formatter(time, 0, 0, props.timeZone).text);
  state.setTimeValue(props.timeSliderScalarRef.current * state.range)
  return [time, sliderScalar];
}

const externalDriverTime = (props: TimeSliderProps, state: TimeSliderState, payload: any) => {
  let time = payload.flowPanel?.time;
  if (typeof time !== 'number') {
    for(let i = 0; i < payload.data?.fields?.length; i++) {
      if (payload.data?.fields[i].type === 'time') {
        time = payload.data.fields[i].values?.[payload.rowIndex];
        break;
      }
    }
  }
  return typeof time === 'number' ? Math.max(0, Math.min(state.range, state.range * (time - props.tsData.timeMin) / props.tsData.timeRange)) : null;
}

const externalDriverPosition = (props: TimeSliderProps, state: TimeSliderState, payload: any) => {
  let position = payload.flowPanel?.position;
  if (typeof position !== 'number') {
    for(let i = 0; i < payload.data?.fields?.length; i++) {
      if (payload.data?.fields[i].type === 'time') {
        const values = payload.data.fields[i].values;
        if (isArray(values) && values.length > 0) {
          const time = values[payload.rowIndex];
          const timeMin = values[0];
          const timeRange = values[values.length - 1] - values[0];
          position = Math.max(0, Math.min(1, (time - timeMin) / timeRange));
        }
        break;
      }
    }
  }
  return typeof position === 'number' ? position * state.range : null;
}

const externalDriver = (props: TimeSliderProps, state: TimeSliderState, payload: any) => {
  // Confirm validity and relevance
  if ((typeof payload === 'object') && (payload.flowPanel?.id !== state.panelId)) {
    const sliderPos = (props.mode === 'time') ? externalDriverTime(props, state, payload) :
      (props.mode === 'position') ? externalDriverPosition(props, state, payload) : null;

    if ((typeof sliderPos === 'number') && (sliderPos !== props.timeSliderScalarRef.current)) {
      handleOnChange(props, state, {target: {value: sliderPos}});
    }
  }
}

const getHoverEvent = (props: TimeSliderProps, state: TimeSliderState, time: number, sliderScalar: number) => {
  const eventData: DataHoverPayloadFlowPanel = {
    data: {
      fields:[{
        name: 'time',
        type: FieldType.time,
        values: [props.tsData.timeMin, time, props.tsData.timeMin + props.tsData.timeRange],
        config: {},
      }],
      length: 3,
    },
    rowIndex: 1,
    point: {time: time},
    flowPanel: {
      id: state.panelId,
      time: time,
      position: sliderScalar,
    },
  };
  return new DataHoverEvent(eventData);
}

export const TimeSliderFactory = (props: TimeSliderProps) => {
  const setLabel = props.setLabel;
  const labelWidth = 150;
  const animControlWidth = props.animControl ? 35 : 0;
  const timeSlideShowControlWidth = props.timeSlideShowControl ? 35 : 0;
  let sliderWidth = props.windowWidth - labelWidth - animControlWidth - timeSlideShowControlWidth;
  const initialRange = 1000;
  const [timeValue, setTimeValue] = useState<number>(props.timeSliderScalarRef.current * initialRange);

  const stateRef = useRef<TimeSliderState>({
    formatter: getValueFormatterIndex()['dateTimeAsSystem'],
    panelId: 'panel' + (gPanelIdCallCount++).toString(),
    range: initialRange,
    setTimeValue: setTimeValue,
  });
  const playTimerRef = useRef<number | null>(null);

  // Subscribe to the eventsBus hoverEvent to synchronise timeSliders 
  useEffect(() => {
    if (props.mode !== 'local') {
      const subscriber = props.eventBus.getStream(DataHoverEvent).subscribe((event) => {
        externalDriver(props, stateRef.current, event.payload)
      });

      return () => {
        subscriber.unsubscribe();
      };
    }
    return;
  }, [props]);

  // Resync value when disabled and local
  if (!props.enabled && props.mode === 'local') {
    props.timeSliderScalarRef.current = 1.0;
  }

  // Set the label
  useEffect(() => {
    const epochTime = sliderTime(props.tsData, props.timeSliderScalarRef.current);
    setLabel(stateRef.current.formatter(epochTime, 0, 0, props.timeZone).text);
  }, [setLabel, props.tsData, props.timeSliderScalarRef, props.timeZone]);

  useEffect(() => {
    const stepMs = props.timeSliderPlayIntervalMs ?? 500;
    const step = (1 / (props.timeSlideShowSteps-1)); // 0.01

    if (!props.timeSlideShowIsPlayingContentRef.current) {
      if (playTimerRef.current !== null) {
        window.clearInterval(playTimerRef.current);
        playTimerRef.current = null;
      }
      return;
    } else {
      const current = props.timeSliderScalarRef.current;
      if ( current >= 1 ) {
        props.timeSliderScalarRef.current = 0
      } else {
        const tmp = props.timeSliderScalarRef.current + step;
        // check rounding problems
        if (tmp + 1E-4 >=1) {
          props.timeSliderScalarRef.current = 1
        } else {
          props.timeSliderScalarRef.current = tmp;
        }
      }
      setTimeValue(props.timeSliderScalarRef.current * stateRef.current.range);
    }

    playTimerRef.current = window.setInterval(() => {
      const current = props.timeSliderScalarRef.current;

      if (current >= 1) {
        props.timeSliderScalarRef.current = 0;
      } else {
        const tmp = current + step;
        if (tmp + 1E-4 >=1) {
          props.timeSliderScalarRef.current = 1
        } else {
          props.timeSliderScalarRef.current = Math.min( tmp, 1);
        }
      }
      setTimeValue(props.timeSliderScalarRef.current * stateRef.current.range);
    }, stepMs);

    return () => {
      if (playTimerRef.current !== null) {
        window.clearInterval(playTimerRef.current);
        playTimerRef.current = null;
      }
    };
  }, [props.timeSlideShowIsPlayingContentRef.current, props.timeSliderPlayIntervalMs, props.timeSlideShowSteps]);

  // Local onChange handler
  const handleOnChangeLocal = (event: any) => {
    const state = stateRef.current;
    const [time, sliderScalar] = handleOnChange(props, state, event);
    
    // Publish the event
    if (props.mode !== 'local') {
      props.eventBus.publish(getHoverEvent(props, state, time, sliderScalar));

      // There's a case for only disabling at 1 but the problem is the timeSeries
      // panel ignores '0'. They don't ignore '1'...
      if ((sliderScalar === 0) || (sliderScalar === 1)) {
        props.eventBus.publish(new DataHoverClearEvent());
      }
    }
  }

  const range = stateRef.current.range;

  // JSX TimeSlider
  return (
    <div>
      <div className={cx(
        props.styles.wrapper,
        css`
        text-align: left;
        white-space: nowrap;
        display: flex;
        gap: 5px;
        `
        )}>
        {props.animControl}
        <input
          type="range"
          style={{width: sliderWidth}}
          min="0"
          max={range}
          value={timeValue}
          id="timeSlider"
          onChange={handleOnChangeLocal}
        />
        <label>{props.label}</label>
        {props.timeSlideShowControl}
      </div>
    </div>
  );
}
