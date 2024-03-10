# Changelog

## 1.4.0
Changes the data-series name to be sourced from getFieldDisplayName(field, frame).
This is a much more involved grafana backed name resolution that should work with
all the various ways grafana allows series to be named. Added to resolve issue raised
with a prometheus data query.

## 1.3.6
Grafana 10.0.0 base.

- rebases the required dependency to Grafana 10.0.0
- corrects readme example picture links to work from grafana plugins page
- starts maintaining this changelog

## 1.3.4
Grafana 10.0.3 base.

Initial release.
