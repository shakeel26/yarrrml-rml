// import { Writer as N3Writer } from 'n3';
const N3 = require('n3')
// import * as YarrrmlParser from '@rmlio/yarrrml-parser/lib/rml-generator';
const YarrrmlParser = require('@rmlio/yarrrml-parser/lib/rml-generator')

const yarrrmlMapping = `prefixes:
  schema: "http://schema.org/"
  myfunc: "http://myfunc.com/"
mappings:
  person:
    sources:
      - ['input~jsonpath', '$.persons[*]']
    s: http://example.com/$(firstname)
    po:
      - [a, schema:Person]
      - [schema:name, $(firstname)]
      - [schema:language, $(speaks.*)]
`;





const yarrrmlExtend = (yarrrml) => {
  // replace function
  let str = yarrrml.replace(
    /((?:parameters|pms): *\[)([\w@^./$()*"' ,[\]|=]+)(\])/g,
    (...e) => {
      const [, cg1, cg2, cg3] = e;
      const params = cg2
        .split(',')
        .map((el, i) => `[schema:str${i}, ${el.trim()}]`)
        .join(', ');
      return cg1 + params + cg3;
    },
  );
  // replace join
  str = str.replace(
    /join: *\[ *"?([\w@^./$:\-*, '()~]+)"? *, *"?([\w@^./$:\-*, '()~]+)"? *\]/g,
    'condition:{function:equal,parameters:[[str1,"$($1)"],[str2,"$($2)"]]}',
  );
  return str;
};



const yarrrmlEncodeBrackets = (str) => {
  let level = 0;
  let ret = '';

  for (let i = 0; i < str.length; i += 1) {
    const c = str[i];

    if (level < 0) {
      throw new Error('failed parsing brackets');
    }

    if (level === 0) {
      switch (c) {
        case '$':
          if (str[i + 1] === '(') {
            level += 1;
            i += 1;
            ret += '$(';
          } else {
            ret += c;
          }
          break;
        case '(':
        case ')':
        default:
          ret += c;
      }
    } else {
      switch (c) {
        case '(':
          level += 1;
          ret += '$LBR';
          break;
        case ')':
          level -= 1;
          if (level === 0) {
            ret += ')';
          } else {
            ret += '$RBR';
          }
          break;
        default:
          ret += c;
      }
    }
  }
  return ret;
};


const yarrrmlParse = (yaml) =>
  new Promise((resolve) => {
    const y2r = new YarrrmlParser();
    const yamlQuads = y2r.convert(yaml);
    let prefixes = {
      rr: 'http://www.w3.org/ns/r2rml#',
      rml: 'http://semweb.mmlab.be/ns/rml#',
      xsd: 'http://www.w3.org/2001/XMLSchema#',
      schema: 'http://schema.org/',
      rdf: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#',
      rdfs: 'http://www.w3.org/2000/01/rdf-schema#',
      fnml: 'http://semweb.mmlab.be/ns/fnml#',
      fno: 'http://w3id.org/function/ontology#',
      mex: 'http://mapping.example.com/',
    };
    prefixes = { ...prefixes, ...y2r.getPrefixes() };

    const writer = new N3.Writer({ prefixes });
    writer.addQuads(yamlQuads);
    writer.end((_, result) => {
      resolve(result);
    });
  });


  // name$LBR.$RBR -> name(.)
const escapeTable = {
  '(': '\\$LBR',
  ')': '\\$RBR',
  '{': '\\$LCB',
  '}': '\\$RCB',
};


  const decodeRMLReplacements = (rml) =>
  Object.entries(escapeTable).reduce(
    (str, [char, code]) => str.replace(new RegExp(code, 'g'), char),
    rml,
  );


  
const yarrrmlPlusToRml = async (yarrrml) => {
    let mappingStr = yarrrmlExtend(yarrrml);
    mappingStr = yarrrmlEncodeBrackets(mappingStr);
    console.log(mappingStr)
  
    mappingStr = await yarrrmlParse(mappingStr);
    mappingStr = decodeRMLReplacements(mappingStr);
    return mappingStr;
  };
  
  
  
  const runMapping = async () => {
    console.time("time") 
    let rmlMapping = await yarrrmlPlusToRml(yarrrmlMapping);
    console.log(rmlMapping)
  }

  runMapping()