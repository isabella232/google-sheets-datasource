import React, { PureComponent, ChangeEvent } from 'react';
import { QueryEditorProps } from '@grafana/data';
import { LinkButton, FormLabel, Segment, SegmentAsync } from '@grafana/ui';
import { DataSource } from './DataSource';
import { MetricColumns } from './components/MetricColumns';
import {
  SheetsQuery,
  SheetsSourceOptions,
  GoogleSheetRangeInfo,
  majorDimensions,
  resultFormats,
  ResultFormatType,
  MajorDimensionType,
} from './types';

type Props = QueryEditorProps<DataSource, SheetsQuery, SheetsSourceOptions>;

interface State {}

export function getGoogleSheetRangeInfoFromURL(url: string): Partial<GoogleSheetRangeInfo> {
  let idx = url?.indexOf('/d/');
  if (!idx) {
    // The original value
    return { spreadsheetId: url };
  }

  let id = url.substring(idx + 3);
  idx = id.indexOf('/');
  if (idx) {
    id = id.substring(0, idx);
  }

  idx = url.indexOf('range=');
  if (idx > 0) {
    const sub = url.substring(idx + 'range='.length);
    return { spreadsheetId: id, range: sub };
  }
  return { spreadsheetId: id };
}

export function toGoogleURL(info: GoogleSheetRangeInfo): string {
  let url = `https://docs.google.com/spreadsheets/d/${info.spreadsheetId}/view`;
  if (info.range) {
    url += '#range=' + info.range;
  }
  return url;
}

const PASTE_SEPERATOR = '»';

export class QueryEditor extends PureComponent<Props, State> {
  componentWillMount() {
    if (!this.props.query.queryType) {
      this.props.query.queryType = 'query';
    }

    if (!this.props.query.resultFormat) {
      this.props.query.resultFormat = ResultFormatType.TABLE;
    }

    if (!this.props.query.majorDimension) {
      this.props.query.majorDimension = MajorDimensionType.ROWS;
    }

    if (!this.props.query.metricColumns) {
      this.props.query.metricColumns = [];
    }

    if (!this.props.query.timeColumn) {
      this.props.query.timeColumn = [];
    }
  }

  onSpreadsheetIdPasted = (e: any) => {
    const v = e.clipboardData.getData('text/plain');
    if (v) {
      const info = getGoogleSheetRangeInfoFromURL(v);
      if (info.spreadsheetId) {
        console.log('PASTED', v, info);
        info.spreadsheetId = info.spreadsheetId + PASTE_SEPERATOR;
        this.props.onChange({
          ...this.props.query,
          ...info,
        });
        console.log('UPDATED', info);
      }
    }
  };

  onSpreadsheetIdChange = (event: ChangeEvent<HTMLInputElement>) => {
    console.log('CHANGE', event.target.value);
    let v = event.target.value;
    const idx = v.indexOf(PASTE_SEPERATOR);
    if (idx > 0) {
      v = v.substring(0, idx);
    }
    this.props.onChange({
      ...this.props.query,
      spreadsheetId: v,
    });
  };

  onRangeChange = (event: ChangeEvent<HTMLInputElement>) => {
    this.props.onChange({
      ...this.props.query,
      range: event.target.value,
    });
  };

  SpreadsheetIdTooltip = () => (
    <p>
      The <code>spreadsheetId</code> is used to identify which spreadsheet is to be accessed or altered. This ID is the value between the "/d/" and
      the "/edit" in the URL of your spreadsheet.
    </p>
  );

  render() {
    const { query, onRunQuery, onChange, datasource } = this.props;
    return (
      <>
        <div className={'gf-form-inline'}>
          <FormLabel
            width={10}
            className="query-keyword"
            tooltip={
              <p>
                The <code>spreadsheetId</code> is used to identify which spreadsheet is to be accessed or altered. This ID is the value between the
                "/d/" and the "/edit" in the URL of your spreadsheet.
              </p>
            }
          >
            Spreadsheet ID
          </FormLabel>
          <input
            className="gf-form-input width-28"
            placeholder="Enter ID from URL"
            value={query.spreadsheetId || ''}
            onPaste={this.onSpreadsheetIdPasted}
            onChange={this.onSpreadsheetIdChange}
            onBlur={onRunQuery}
          ></input>
          <LinkButton disabled={!query.spreadsheetId} variant="secondary" icon="fa fa-link" href={toGoogleURL(query)} target="_blank"></LinkButton>
          <div className="gf-form gf-form--grow">
            <div className="gf-form-label gf-form-label--grow" />
          </div>
        </div>

        <div className={'gf-form-inline'}>
          <FormLabel
            width={10}
            className="query-keyword"
            tooltip={
              <p>
                A string like <code>Sheet1!A1:B2</code>, that refers to a group of cells in the spreadsheet, and is typically used in formulas.Named
                ranges are also supported. When a named range conflicts with a sheet's name, the named range is preferred.
              </p>
            }
          >
            Range
          </FormLabel>
          <input
            className="gf-form-input width-14"
            value={query.range || ''}
            placeholder="ie: Class Data!A2:E"
            onChange={this.onRangeChange}
            onBlur={onRunQuery}
          ></input>
          <FormLabel width={10} className="query-keyword">
            Major Dimension
          </FormLabel>
          <Segment
            options={majorDimensions}
            value={majorDimensions.find(({ value }) => value === query.majorDimension)}
            onChange={({ value }) => {
              onChange({ ...query, majorDimension: value! });
              onRunQuery();
            }}
          />
          <div className="gf-form gf-form--grow">
            <div className="gf-form-label gf-form-label--grow" />
          </div>
        </div>
        <div className={'gf-form-inline'}>
          <FormLabel width={10} className="query-keyword">
            Format
          </FormLabel>
          <Segment
            options={resultFormats}
            value={resultFormats.find(({ value }) => value === query.resultFormat)}
            onChange={({ value }) => {
              onChange({ ...query, resultFormat: value! });
              onRunQuery();
            }}
          />

          {query.resultFormat == ResultFormatType.TIME_SERIES && (
            <>
              <FormLabel width={8} className="query-keyword">
                Time Column
              </FormLabel>
              <SegmentAsync
                loadOptions={() => datasource.metricFindQuery(query, 'getHeaders')}
                value={query.timeColumn}
                placeholder="Select time column"
                onChange={option => {
                  onChange({ ...query, timeColumn: option });
                  onRunQuery();
                }}
              />
              <FormLabel width={8} className="query-keyword">
                Metric Column
              </FormLabel>
              <MetricColumns
                values={query.metricColumns}
                onChange={options => {
                  console.log({ options });

                  onChange({ ...query, metricColumns: options });
                  onRunQuery();
                }}
                loadColumns={() =>
                  datasource.metricFindQuery(query, 'getHeaders').then(values => values.filter(({ value }) => value !== query.timeColumn.value))
                }
              ></MetricColumns>
            </>
          )}

          <div className="gf-form gf-form--grow">
            <div className="gf-form-label gf-form-label--grow" />
          </div>
        </div>
      </>
    );
  }
}
