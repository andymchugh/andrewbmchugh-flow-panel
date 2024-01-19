import YAML from 'yaml';
import { getTemplateSrv } from '@grafana/runtime';
import { isUrl } from 'components/Utils';

//-----------------------------------------------------------------------------

// Receives an svg source and calls the callback with the associated svg string.
// The source can be:
// - Serialised svg string
// - A url to the serialised svg
export async function loadSvg(source: string, fn: (svgStr: string) => void) {
  try {
    if (!isUrl(source)) {
      fn(source.substring(source.search('<svg')));
    }
    else {
      const response = await fetch(source);
      if (!response.ok) {
        throw(response);
      }
      const responseText = await response.text();
      fn(responseText.substring(responseText.search('<svg')));
    }
  } catch(err) {
    console.log('Error loading svg. source =', source, ', error =', err);
    fn('<svg/>');
  }
}

// Receives a yaml source and calls the callback with the associated yaml object.
// The source can be:
// - The actual object
// - Serialised yaml
// - A url to the serialised yaml
export async function loadYaml(source: (Object | string), fn: (yaml: Object) => void) {
  try {
    if (typeof source === 'object') {
      fn(source);
    }
    else if (!isUrl(source)) {
      fn(YAML.parse(source));
    }
    else {
      const source2 = getTemplateSrv().replace(source);
      const response = await fetch(source2);
      if (!response.ok) {
        throw(response);
      }
      const responseText = await response.text();
      const responseYaml = YAML.parse(responseText);
      fn(responseYaml);
    }
  } catch(err) {
    console.log('Error loading config. source =', source, ', error =', err);
    fn({});
  }
}


