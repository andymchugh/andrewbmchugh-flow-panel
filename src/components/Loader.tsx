import YAML from 'yaml';
import { VariableInterpolation, getTemplateSrv } from '@grafana/runtime';
import { flowDebug, isUrl } from 'components/Utils';

//-----------------------------------------------------------------------------

function extractInterpolations(interpolations: VariableInterpolation[]) {
  let ids = '';
  for (const interp of interpolations) {
    ids += interp.match + '|';
  }
  return ids;
}

// Receives an svg source and calls the callback with the associated svg string.
// The source can be:
// - Serialized svg string
// - A url to the serialized svg
export async function loadSvg(source: string, fn: (svgStr: string) => void, fnVars: (svgStr: string) => void) {
  try {
    if (!isUrl(source)) {
      fn(source.substring(source.search('<svg')));
    }
    else {
      let interpolations: VariableInterpolation[] = [];
      const source2 = getTemplateSrv().replace(source, undefined, undefined, interpolations);
      fnVars(extractInterpolations(interpolations));
      const response = await fetch(source2);
      if (!response.ok) {
        throw(response);
      }
      const responseText = await response.text();
      fn(responseText.substring(responseText.search('<svg')));
    }
  } catch(err) {
    flowDebug().warn('Error loading svg. source =', source, ', error =', err);
    fn('<svg/>');
  }
}

// Receives a yaml source and calls the callback with the associated yaml object.
// The source can be:
// - The actual object
// - Serialized yaml
// - A url to the serialized yaml
export async function loadYaml(source: (Object | string), error: React.MutableRefObject<any | undefined>, fn: (yaml: Object) => void, fnVars: (svgStr: string) => void) {
  // The default maxAliasCount of 100 gets hit with more complex yaml docs.
  // We don't want to allow unlimited (-1) or even configurable as that allows people
  // to configure unreasonable dashboards. Instead we amp up the limit by 100x.
  const yamlOptions = {maxAliasCount: 10000};
  try {
    if (typeof source === 'object') {
      fn(source);
    }
    else if (!isUrl(source)) {
      fn(YAML.parse(source || '', yamlOptions));
    }
    else {
      let interpolations: VariableInterpolation[] = [];
      const source2 = getTemplateSrv().replace(source, undefined, undefined, interpolations);
      fnVars(extractInterpolations(interpolations));
      const response = await fetch(source2);
      if (!response.ok) {
        throw(response);
      }
      const responseText = await response.text();
      const responseYaml = YAML.parse(responseText, yamlOptions);
      fn(responseYaml);
    }
  } catch(err: any) {
    flowDebug().warn('Error loading config. source =', source, ', error =', err);
    error.current = err.message
    fn({});
  }
}


