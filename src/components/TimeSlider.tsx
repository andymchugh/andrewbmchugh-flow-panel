import React, { useEffect, useRef } from 'react';
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
}

type TimeSliderState = {
  formatter: ValueFormatter;
  panelId: string;
  range: number;
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
  // Confirm validity and relevence
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
  const sliderWidth = props.windowWidth - labelWidth - animControlWidth;

  const stateRef = useRef<TimeSliderState>({
    formatter: getValueFormatterIndex()['dateTimeAsSystem'],
    panelId: 'panel' + (gPanelIdCallCount++).toString(),
    range: 1000,
  });

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

  // JSX TimeSlider
  const range = stateRef.current.range
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
          value={props.timeSliderScalarRef.current * range}
          id="timeSlider"
          onChange={handleOnChangeLocal}
        />
        <label>{props.label}</label>
      </div>
    </div>
  );
}
