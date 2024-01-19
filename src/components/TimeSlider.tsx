import React, { useEffect } from 'react';
import { css, cx } from '@emotion/css';
import { getValueFormatterIndex, ValueFormatter } from '@grafana/data';
import { TimeSeriesData } from 'components/TimeSeries';

export interface TimeSliderProps {
  styles: any;
  tsData: TimeSeriesData;
  setLabel: React.Dispatch<React.SetStateAction<string | undefined>>;
  label: string | undefined;
  timeZone: string;
  timeSliderScalarRef: React.MutableRefObject<number>;
  enabled: boolean;
  windowWidth: number;
}

export const sliderTime = (tsData: any, sliderScalar: number) => {
  const time = Math.ceil(tsData.timeMin + (tsData.timeRange * sliderScalar));
  return time;
}

export const TimeSliderFactory = (props: TimeSliderProps) => {
  const formatter: ValueFormatter = getValueFormatterIndex()['dateTimeAsLocal'];
  //const formatter: ValueFormatter = getValueFormatterIndex()['dateTimeAsIso'];
  const range = 1000;
  const setLabel = props.setLabel;
  const labelWidth = 170;
  const sliderWidth = props.windowWidth - labelWidth;

  // Resync value export when disabled
  if (!props.enabled) {
    props.timeSliderScalarRef.current = 1.0;
  }

  // Set the label
  useEffect(() => {
    const epochTime = sliderTime(props.tsData, props.timeSliderScalarRef.current);
    setLabel(formatter(epochTime, 0, 0, props.timeZone).text);
  }, [formatter, setLabel, props.tsData, props.timeSliderScalarRef, props.timeZone]);

  const handleOnChange = (event: any) => {
    const sliderScalar = event.target.value / range;
    const time = sliderTime(props.tsData, sliderScalar);
    props.timeSliderScalarRef.current = sliderScalar;
    props.setLabel(formatter(time).text);
  }

  return (
    <div className={cx(
      props.styles.wrapper,
      css`
      text-align: left;
      display: flex;
      gap: 5px;
      `
      )}>
      <input
        type="range"
        style={{width: sliderWidth}}
        min="0"
        max={range}
        defaultValue={range}
        id="timeSlider"
        onChange={handleOnChange}
      />
      <label>{props.label}</label>
    </div>
  );
}
