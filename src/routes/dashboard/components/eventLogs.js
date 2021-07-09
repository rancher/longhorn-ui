import React from 'react'
import PropTypes from 'prop-types'
import { Table, Input, Button, Icon } from 'antd'
import { sortTable, sortTableByISODate } from '../../../utils/sort'
import { setSortOrder } from '../../../utils/store'
import './eventLogs.less'

class EventLogs extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      filterDropdownVisible: false,
      filterNameDropdownVisible: false,
      filterSourceDropdownVisible: false,
      data: props.data,
      searchText: '',
      searchField: '',
      searchInput: {
        nameText: '',
        sourceText: '',
      },
    }
  }

  UNSAFE_componentWillReceiveProps(nextProps) {
    const { searchField, searchText } = this.state
    const data = this.parseData(nextProps.data)
    if (searchField && searchText) {
      this.setState({ ...this.state, data: this.filterData(data, searchField, searchText) })
    } else {
      this.setState({ ...this.state, data })
    }
  }

  onSearchNameChange = (e) => {
    this.setState({ ...this.state, searchInput: { ...this.state.searchInput, nameText: e.target.value } })
  }

  onSearchSourceChange = (e) => {
    this.setState({ ...this.state, searchInput: { ...this.state.searchInput, sourceText: e.target.value } })
  }

  onSearch = (searchField) => {
    const data = this.parseData(this.props.data)
    const searchText = this.state.searchInput[searchField]
    const filteredData = this.filterData(data, searchField, searchText)
    this.setState({
      filterDropdownVisible: false,
      filterNameDropdownVisible: false,
      filterSourceDropdownVisible: false,
      data: filteredData,
      searchField,
      searchText,
    })
  }

  onReset = () => {
    const { data } = this.props
    this.setState({
      ...this.state,
      data: this.parseData(data),
      searchText: '',
      searchField: '',
      searchInput: {
        nameText: '',
        sourceText: '',
      },
    })
  }

  parseData = (data) => {
    const getSourceText = (source) => {
      return source ? Object.values(source).join(', ') : ''
    }
    return data.map(item => ({ ...item, sourceText: getSourceText(item.source), nameText: item.involvedObject ? item.involvedObject.name : '' })).sort((a, b) => sortTableByISODate(b, a, 'lastTimestamp'))
  }

  wrapValue = (value, searchText) => {
    if (value) {
      return value.split(new RegExp(`(?<=${searchText})|(?=${searchText})`, 'i')).map((fragment, i) => (
        fragment.toLowerCase() === searchText.toLowerCase()
          ? <span key={i} className="highlight">{fragment}</span> : fragment // eslint-disable-line
      ))
    }
    return value
  }

  filterData = (data, field, searchText) => {
    if (searchText.trim() === '') {
      return data
    }
    const d = data.filter(item => item[field].toLowerCase().includes(searchText))
    switch (field) {
      case 'nameText':
        return d.map(item => ({ ...item, nameText: this.wrapValue(item.nameText, searchText) }))
      case 'sourceText':
        return d.map(item => ({ ...item, sourceText: this.wrapValue(item.sourceText, searchText) }))
      default:
        return d
    }
  }

  render() {
    const { data, sorter, onSorterChange = f => f } = this.props
    const rowClassName = (record, index) => {
      if (index % 2 === 0) {
        return 'rowStriped'
      }
      return ''
    }
    const filtersEventType = Array.from(data.filter(item => item.eventType !== '')
      .reduce((results, item) => {
        results.add(item.eventType)
        return results
      }, new Set()))
      .map(item => ({ text: item, value: item }))
    const filtersKind = Array.from(data.filter(item => item.involvedObject && item.involvedObject.kind !== '')
      .reduce((results, item) => {
        results.add(item.involvedObject.kind)
        return results
      }, new Set())).map(item => ({ text: item, value: item }))
    const columns = [
      {
        title: 'Last Seen',
        dataIndex: 'lastTimestamp',
        key: 'lastTimestamp',
        className: 'date',
        sorter: (a, b) => sortTableByISODate(a, b, 'lastTimestamp'),
        render(text) {
          return (<div className="seenTime">{text}</div>)
        },
      }, {
        title: 'First Seen',
        dataIndex: 'firstTimestamp',
        key: 'firstTimestamp',
        className: 'date',
        sorter: (a, b) => sortTableByISODate(a, b, 'firstTimestamp'),
        render(text) {
          return (<div className="seenTime">{text}</div>)
        },
      }, {
        title: 'Count',
        dataIndex: 'count',
        key: 'count',
        className: 'text',
        sorter: (a, b) => sortTable(a, b, 'count'),
        render(text) {
          return (<div className="count">{text}</div>)
        },
      }, {
        title: 'Name',
        dataIndex: 'nameText',
        key: 'nameText',
        className: 'name',
        filterIcon: <Icon type="filter" style={{ color: this.state.searchField === 'nameText' && this.state.searchText ? '#862493' : '#aaa' }} />,
        filterDropdown: (
          <div className="filter-dropdown">
            <Input
              ref={ele => { this.searchNameInput = ele }}
              placeholder="Search name"
              value={this.state.searchInput.nameText}
              onChange={this.onSearchNameChange}
              onPressEnter={() => this.onSearch('nameText')}
            />
            <Button type="link" onClick={() => this.onSearch('nameText')}>OK</Button>
            <Button type="link" onClick={this.onReset}>Reset</Button>
          </div>
        ),
        filterDropdownVisible: this.state.filterNameDropdownVisible,
        onFilterDropdownVisibleChange: (visible) => {
          this.setState({
            filterNameDropdownVisible: visible,
          }, () => this.searchNameInput.focus())
        },
        sorter: (a, b) => sortTable(a, b, 'nameText'),
        render: (text) => {
          const { filtered, searchField, searchText } = this.state
          return filtered && searchField === 'nameText' && searchText && text ? (
            <div className="name">
              {text.split(new RegExp(`(?<=${searchText})|(?=${searchText})`, 'i')).map((fragment, i) => (
                fragment.toLowerCase() === searchText.toLowerCase()
                  ? <span key={i} className="highlight">{fragment}</span> : fragment // eslint-disable-line
              ))}
            </div>
          ) : <div className="name">{text}</div>
        },
      }, {
        title: 'Kind',
        dataIndex: 'involvedObject.kind',
        key: 'involvedObject.kind',
        className: 'text',
        filters: filtersKind,
        sorter: (a, b) => sortTable(a, b, 'involvedObject.kind'),
        onFilter: (value, record) => ((record.involvedObject && record.involvedObject.kind) || '').indexOf(value) === 0,
        render(text) {
          return (<div className="kind">{text}</div>)
        },
      },
      // {
      //   title: 'Subobject',
      //   dataIndex: 'involvedObject.fieldPath',
      //   key: 'involvedObject.fieldPath',
      //   className: 'text',
      //   sorter: (a, b) => sortTable(a, b, 'involvedObject.fieldPath'),
      //   render: (text) => {
      //     return <div className="subobject">{text}</div>
      //   },
      // },
      {
        title: 'Type',
        dataIndex: 'eventType',
        key: 'eventType',
        className: 'text',
        width: 120,
        filters: filtersEventType,
        sorter: (a, b) => sortTable(a, b, 'eventType'),
        onFilter: (value, record) => (record.eventType || '').indexOf(value) === 0,
        render(text) {
          return (<div className="eventType">{text}</div>)
        },
      }, {
        title: 'Reason',
        dataIndex: 'reason',
        key: 'reason',
        className: 'reason',
        sorter: (a, b) => sortTable(a, b, 'reason'),
        render: (text) => {
          return <div className="reason">{text}</div>
        },
      }, {
        title: 'Source',
        dataIndex: 'sourceText',
        key: 'sourceText',
        className: 'text',
        sorter: (a, b) => sortTable(a, b, 'sourceText'),
        filterIcon: <Icon type="filter" style={{ color: this.state.searchField === 'sourceText' && this.state.searchText ? '#862493' : '#aaa' }} />,
        filterDropdown: (
          <div className="filter-dropdown">
            <Input
              ref={ele => { this.searchSourceInput = ele }}
              placeholder="Search source"
              value={this.state.searchInput.sourceText}
              onChange={this.onSearchSourceChange}
              onPressEnter={() => this.onSearch('sourceText')}
            />
            <Button type="link" onClick={() => this.onSearch('sourceText')}>OK</Button>
            <Button type="link" onClick={this.onReset}>Reset</Button>
          </div>
        ),
        filterDropdownVisible: this.state.filterSourceDropdownVisible,
        onFilterDropdownVisibleChange: (visible) => {
          this.setState({
            filterSourceDropdownVisible: visible,
          }, () => this.searchSourceInput.focus())
        },
      }, {
        title: 'Message',
        dataIndex: 'message',
        className: 'text',
        width: 200,
        render: (text) => {
          return <div style={{ maxHeight: 80, overflow: 'auto' }}>{text}</div>
        },
      },
    ]
    const onChange = (p, f, s) => {
      onSorterChange(s)
    }
    setSortOrder(columns, sorter)
    return (
      <div className="eventLogs">
        <div className="title">Event Log</div>
          <div className="content">
            <Table columns={columns}
              onChange={onChange}
              rowClassName={rowClassName}
              getPopupContainer={trigger => trigger.parentNode}
              rowKey={(record, key) => key}
              dataSource={this.state.data} />
         </div>
       </div>
    )
  }
}

EventLogs.propTypes = {
  data: PropTypes.array,
  sorter: PropTypes.object,
  onSorterChange: PropTypes.func,
}

export default EventLogs
