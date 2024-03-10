import React from 'react';
import { cx } from '@emotion/css';
import { LegendDisplayMode, VizLegend, VizLegendItem } from '@grafana/ui';
import { PanelConfigHighlighter } from 'components/Config';

export enum HighlightState {
  Highlight,
  Lowlight,
  Ambient,
};

export interface HighlighterProps {
  styles: any;
  enabled: boolean;
  highlighterConfig: PanelConfigHighlighter | undefined;
  setSelection: React.Dispatch<React.SetStateAction<string | undefined>>;
  selection: string | undefined;
};

function legendItems(config: PanelConfigHighlighter, selection: string | undefined) {
  return config.tagLegend.map((label: string) => {
    return {
      label: label,
      yAxis: 1,
      disabled: !config.tagDrivable.has(label),
      color: label === selection ? config.color : undefined,
    }
  });
}

export const HighlighterFactory = (props: HighlighterProps) => {

  const onLabelClick = (item: VizLegendItem<string>, event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
    if ((props.selection === item.label) || !props.highlighterConfig?.tagDrivable.has(item.label)) {
      props.setSelection(undefined);
    }
    else {
      props.setSelection(item.label);
    }
  }

  const items = props.enabled && props.highlighterConfig ? legendItems(props.highlighterConfig, props.selection) : [];

  return (
    <div className={cx(props.styles.wrapper)}>
      <hr/>
      {VizLegend({
        placement: 'bottom',
        displayMode: LegendDisplayMode.List,
        items: items,
        onLabelClick: onLabelClick,
        readonly: false,
      })}
    </div>
  );
}
