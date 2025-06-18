import React from 'react';
import { StandardEditorProps } from '@grafana/data';

export const PasswordEditor = ({ value, onChange }: StandardEditorProps<string>) => {
  return (
    <input
      type="password"
      value={value ?? ''}
      onChange={(e) => onChange(e.currentTarget.value)}
      placeholder="Enter token"
      style={{ width: '100%' }}
    />
  );
};
