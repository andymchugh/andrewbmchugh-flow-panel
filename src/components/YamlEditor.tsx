import { css } from '@emotion/css';
import React from 'react';

import { GrafanaTheme2 } from '@grafana/data';
import { CodeEditor, useStyles2 } from '@grafana/ui';

export const YamlEditor = (props: any) => {
  const styles = useStyles2(getStyles);
  let resizeObs: any, global_editor: any

  function handleEditorDidMount(editor: any, monaco: any) {
    editor._domElement.style.overflow='auto'
    editor._domElement.style.resize='vertical'
    editor.updateOptions({'fontSize': 12})
    resizeObs = new ResizeObserver( entries => {
      editor.getDomNode().parentNode.parentNode.parentNode.style.height = editor.getDomNode().clientHeight + 2 + 'px'
    })
    global_editor = editor
    resizeObs.observe(editor._domElement)
  }

  function handleEditorWillUnmout( ) {
    resizeObs.disconnect(global_editor._domElement)
    global_editor.dispose()
  }

  return (
    <div>
      <CodeEditor
        value={`${props.value}`}
        language='yaml'
        height={100}
        onEditorDidMount={handleEditorDidMount}
        onEditorWillUnmount={handleEditorWillUnmout}
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
