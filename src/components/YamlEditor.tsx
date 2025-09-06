import { css } from '@emotion/css';
import React from 'react';

import { GrafanaTheme2 } from '@grafana/data';
import { CodeEditor, useStyles2 } from '@grafana/ui';

export const YamlEditor = (props: any) => {
  const styles = useStyles2(getStyles);
  let resizeObs: any

  function handleEditorDidMount(editor: any, monaco: any) {
    editor._domElement.style.overflow='auto'
    editor._domElement.style.resize='vertical'
    editor.updateOptions({'fontSize': 12})
    resizeObs = new ResizeObserver( entries => {
      editor.getDomNode().parentNode.parentNode.parentNode.style.height = editor.getDomNode().clientHeight + 2 + 'px'
    })
    resizeObs.observe(editor._domElement)
  }

  return (
    <div>
      <CodeEditor
        value={`${props.value}`}
        language='yaml'
        height={100}
        onEditorDidMount={handleEditorDidMount}
        containerStyles={styles.codeEditorContainer}
        showMiniMap={false}
        showLineNumbers={false}
        readOnly={false}
        onBlur={props.onChange}
        monacoOptions={{ 
          automaticLayout: true
        }}
      />
    </div>
  );

};

const getStyles = (theme: GrafanaTheme2) => ({
    codeEditorContainer: css({
      // resize: 'vertical',
      overflow: 'unset',
      borderRadius: '2px;',
      border: '1px solid rgba(204, 204, 220, 0.2)',
    }),
  });
