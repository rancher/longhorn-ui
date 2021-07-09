import React from 'react'
import PropTypes from 'prop-types'
import { Table, Progress, Tooltip, Tag, Icon } from 'antd'
import classnames from 'classnames'
import styles from './HostList.less'
import { sortTable } from '../../utils/sort'
import DiskList from './DiskList'
import HostActions from './HostActions'
import InstanceManagerComponent from './components/InstanceManagerComponent'
import { nodeStatusColorMap } from '../../utils/filter'
import { byteToGi, getStorageProgressStatus } from './helper/index'
import { formatMib } from '../../utils/formater'
import { pagination } from '../../utils/page'
import { ModalBlur } from '../../components'

class List extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      expandedRowKeys: [],
      sorterOrderChanged: false,
      modalBlurVisible: false,
      commandKeyDown: false,
      selectedRows: [],
      selectedNode: {},
      rowSelection: {
        selectedRowKeys: [],
        onChange: this.onSelectChange,
      },
      height: 0,
    }
  }

  componentDidMount() {
    let height = document.getElementById('hostTable').offsetHeight - 109
    this.setState({
      height,
    })
    window.onresize = () => {
      height = document.getElementById('hostTable').offsetHeight - 109
      this.setState({
        height,
      })
      this.props.dispatch({ type: 'app/changeNavbar' })
    }
    window.addEventListener('keydown', this.onkeydown)
    window.addEventListener('keyup', this.onkeyup)
  }

  componentWillUnmount() {
    this.props.dispatch({
      type: 'host/hideDiskReplicaModal',
    })
    this.props.dispatch({
      type: 'host/hideReplicaModal',
    })
    window.removeEventListener('keydown', this.onkeydown)
    window.removeEventListener('keyup', this.onkeyup)
    window.onresize = () => {
      this.props.dispatch({ type: 'app/changeNavbar' })
    }
  }

  onkeyup = () => {
    this.setState({
      ...this.state,
      commandKeyDown: false,
    })
  }

  onkeydown = (e) => {
    if ((e.keyCode === 91 || e.keyCode === 17) && !this.state.commandKeyDown) {
      this.setState({
        ...this.state,
        commandKeyDown: true,
      })
    }
  }

  onSelectChange = (_, records) => {
    this.setState({
      ...this.state,
      selectedRows: records,
      rowSelection: {
        ...this.state.rowSelection,
        selectedRowKeys: records.map((item) => item.id),
      },
    })
    this.props.dispatch({
      type: 'host/changeSelection',
      payload: {
        selectedHostRows: records,
      },
    })
  }

  onRowClick = (record, flag) => {
    let selecteRowByClick = [record]

    if (flag) {
      this.state.selectedRows.forEach((item) => {
        if (selecteRowByClick.every((ele) => {
          return ele.id !== item.id
        })) {
          selecteRowByClick.push(item)
        } else {
          selecteRowByClick = selecteRowByClick.filter((ele) => {
            return ele.id !== item.id
          })
        }
      })
    }

    this.setState({
      ...this.state,
      selectedRows: selecteRowByClick,
      rowSelection: {
        ...this.state.rowSelection,
        selectedRowKeys: selecteRowByClick.map((item) => item.id),
      },
    })

    this.props.dispatch({
      type: 'host/changeSelection',
      payload: {
        selectedHostRows: selecteRowByClick,
      },
    })
  }

  onExpand = (expanded, record) => {
    if (expanded) {
      this.setState({
        expandedRowKeys: this.state.expandedRowKeys.concat([record.id]),
      })
    } else {
      this.setState({
        expandedRowKeys: this.state.expandedRowKeys.filter(item => item !== record.id),
      })
    }
  }

  onExpandedRowsChange = (expandedRows) => {
    const { onAllExpandedOrCollapsed = f => f, dataSource } = this.props
    if (expandedRows.length === dataSource.length) {
      onAllExpandedOrCollapsed(true)
    } else if (expandedRows.length === 0) {
      onAllExpandedOrCollapsed(false)
    }
  }

  collapseAll = () => {
    this.setState({
      expandedRowKeys: [],
    })
  }

  expandAll = () => {
    const { dataSource } = this.props
    this.setState({
      expandedRowKeys: dataSource.map(item => item.id),
    })
  }

  conditionsIsReady = (record) => {
    if (record && record.status && record.status.name.toLowerCase() === 'down') {
      return 'NotReady'
    } else if (record && record.conditions && record.conditions.Ready && record.conditions.Ready.type === 'Ready') {
      return 'Ready'
    } else {
      return 'Deploying'
    }
  }

  modalBlurOk = () => {
    this.props.dispatch({
      type: 'host/hideInstanceManagerModal',
    })
  }

  modalBlurCancel = () => {
    this.props.dispatch({
      type: 'host/hideInstanceManagerModal',
    })
  }

  showModalBlur = (record) => {
    this.props.dispatch({
      type: 'host/getInstanceManagerModal',
      payload: record,
    })
  }

  render() {
    const { loading, dataSource, storageOverProvisioningPercentage, minimalSchedulingQuotaWarning, showReplicaModal, deleteHost, showEditDisksModal, showDiskReplicaModal, onSorterChange, defaultInstanceManager, defaultEngineImage, currentNode = f => f } = this.props
    const hostActionsProps = {
      showEditDisksModal,
      deleteHost,
    }

    const computeTotalAllocated = (record) => {
      const max = Object.values(record.disks).reduce((total, item) => total + item.storageMaximum, 0)
      const reserved = Object.values(record.disks).reduce((total, item) => total + item.storageReserved, 0)
      return ((max - reserved) * storageOverProvisioningPercentage) / 100
    }
    const computeAllocated = (record) => {
      return Object.values(record.disks).reduce((total, item) => total + item.storageScheduled, 0)
    }
    const coumputeTotalUsed = (record) => {
      return Object.values(record.disks).reduce((total, item) => total + item.storageMaximum, 0)
    }
    const computeUsed = (record) => {
      return Object.values(record.disks).reduce((total, item) => total + (item.storageMaximum - item.storageAvailable), 0)
    }
    const computeSize = (record) => {
      return Object.values(record.disks).reduce((total, item) => total + (item.storageMaximum - item.storageReserved), 0)
    }
    const computeReserved = (record) => {
      return Object.values(record.disks).reduce((total, item) => total + item.storageReserved, 0)
    }
    const columns = [
      {
        title: <span style={{ display: 'inline-block', padding: '0 0 0 30px' }}>Status</span>,
        dataIndex: 'conditions.Ready.status',
        key: 'status',
        width: 180,
        className: styles.status,
        sorter: (a, b) => sortTable(a, b, 'status.name'),
        render: (text, record) => {
          const status = record && record.status
          const message = record && record.conditions && record.conditions.Ready && record.conditions.Ready.message
          const colorMap = nodeStatusColorMap[status.key] || { color: '', bg: '' }
          return (
            <Tooltip title={`${message}`}>
              <div style={{ padding: '0 0 0 30px' }}>
                <div className={classnames({ capitalize: true })} style={{ display: 'inline-block', padding: '0 4px', color: colorMap.color, border: `1px solid ${colorMap.color}`, backgroundColor: colorMap.bg }}>
                {status.name}
                </div>
              </div>
            </Tooltip>
          )
        },
      },
      {
        title: 'Readiness',
        dataIndex: 'readiness',
        key: 'readiness',
        width: 110,
        render: (text, record) => {
          return (
            <a style={{ textAlign: 'center', display: 'block' }} onClick={() => { this.showModalBlur(record) }}>
              {this.conditionsIsReady(record)}
            </a>
          )
        },
      },
      {
        title: 'Name',
        dataIndex: 'name',
        key: 'name',
        width: 240,
        className: styles.name,
        sorter: (a, b) => sortTable(a, b, 'name'),
        render: (text, record) => {
          return (
            <div style={{ textAlign: 'center' }}>
              <div>{text} {record && (record.region || record.zone) ? <Tooltip title={<span> region: {record.region} <br></br> zone: {record.zone} </span>}><Icon style={{ marginLeft: '5px', color: '#862493' }} type="environment" /></Tooltip> : '' } </div>
              <div className={styles.secondLabel} style={{ color: '#b9b9b9' }}>{record.address}</div>
            </div>
          )
        },
      }, {
        title: 'Replicas',
        dataIndex: 'replicas',
        key: 'replicas',
        width: 120,
        className: styles.replicas,
        sorter: (a, b) => a.replicas.length - b.replicas.length,
        render: (text, record) => {
          return (
            <a style={{ textAlign: 'center', display: 'block', paddingRight: '20px' }} onClick={e => showReplicaModal(record, e)}>
              {text ? text.length : 0}
            </a>
          )
        },
      }, {
        title: 'Allocated',
        dataIndex: 'storageScheduled',
        key: 'allocated',
        width: 160,
        className: styles.allocated,
        sorter: (a, b) => computeAllocated(a) - computeAllocated(b),
        render: (text, record) => {
          const allocated = computeAllocated(record)
          const total = computeTotalAllocated(record)
          const p = total === 0 ? 0 : Math.round((allocated / total) * 100)
          return (
            <div>
              <div>
                <Tooltip title={`${p}%`}>
                  <Progress strokeWidth={14} status={getStorageProgressStatus(minimalSchedulingQuotaWarning, p)} percent={p > 100 ? 100 : p} showInfo={false} />
                </Tooltip>
              </div>
              <div className={styles.secondLabel}>
                {byteToGi(allocated)} / {byteToGi(total)} Gi
              </div>
            </div>
          )
        },
      }, {
        title: 'Used',
        key: 'used',
        width: 160,
        className: styles.used,
        sorter: (a, b) => computeUsed(a) - computeUsed(b),
        render: (text, record) => {
          const used = computeUsed(record)
          const total = coumputeTotalUsed(record)
          const p = total === 0 ? 0 : Math.round((used / total) * 100)
          return (
            <div>
              <div>
                <Tooltip title={`${p}%`}>
                  <Progress strokeWidth={14} status={getStorageProgressStatus(minimalSchedulingQuotaWarning, p)} percent={p > 100 ? 100 : p} showInfo={false} />
                </Tooltip>
              </div>
              <div className={styles.secondLabel}>
                {byteToGi(used)} / {byteToGi(total)} Gi
              </div>
            </div>
          )
        },
      }, {
        title: 'Size',
        key: 'size',
        width: 180,
        className: styles.size,
        sorter: (a, b) => computeSize(b) - computeSize(a),
        render: (text, record) => {
          const reserved = computeReserved(record)
          const total = computeSize(record)
          return (
            <div>
              <div>{formatMib(total < 0 ? 0 : total)}</div>
              <div className={styles.secondLabel} style={{ color: '#b9b9b9', height: '22px' }}>{reserved > 0 ? `+${formatMib(reserved)} Reserved` : null}</div>
            </div>
          )
        },
      },
      {
        title: 'Tags',
        key: 'tags',
        width: 170,
        className: styles.size,
        render: (text, record) => {
          let forMap = (tag, index) => {
            return (
              <span style={{ marginBottom: '6px' }} key={index}>
                <Tag color="rgb(39, 174, 95)">
                  {tag}
                </Tag>
              </span>
            )
          }
          let tagChild = ''
          if (record.tags) {
            tagChild = record.tags.map(forMap)
          }

          return (
            <div style={{ display: 'flex', justifyContent: 'space-between', flexDirection: 'column', alignItems: 'center' }}>
              {tagChild}
            </div>
          )
        },
      },
      {
        title: 'Operation',
        key: 'operation',
        width: 120,
        render: (text, record) => {
          return (
            <HostActions {...hostActionsProps} selected={record} />
          )
        },
      },
    ]
    const disks = function (node) {
      const data = Object.keys(node.disks).map(diskId => {
        const disk = node.disks[diskId]
        return {
          id: diskId,
          ...disk,
        }
      })
      return (
       <DiskList disks={data} node={node} showDiskReplicaModal={showDiskReplicaModal} storageOverProvisioningPercentage={storageOverProvisioningPercentage} minimalSchedulingQuotaWarning={minimalSchedulingQuotaWarning} />
      )
    }
    const onChange = (p, f, s) => {
      onSorterChange(s)
    }
    return (
      <div id="hostTable" style={{ overflow: 'hidden', flex: 1 }}>
        <Table
          className="host-table-class"
          bordered={false}
          columns={columns}
          dataSource={dataSource}
          expandedRowRender={disks}
          onExpand={this.onExpand}
          onRow={record => {
            return {
              onClick: () => {
                this.onRowClick(record, this.state.commandKeyDown)
              },
            }
          }}
          expandedRowKeys={this.state.expandedRowKeys}
          onExpandedRowsChange={this.onExpandedRowsChange}
          loading={loading}
          onChange={onChange}
          simple
          pagination={pagination('hostPageSize')}
          rowSelection={this.state.rowSelection}
          rowKey={record => record.id}
          scroll={{ x: 1440, y: this.state.height }}
        />
        <ModalBlur width={980} title={'Components'} visible={this.props.instanceManagerVisible} onCancel={() => { this.modalBlurCancel() }} onOk={() => { this.modalBlurOk() }} hasOnCancel={true}>
          <InstanceManagerComponent defaultInstanceManager={defaultInstanceManager} defaultEngineImage={defaultEngineImage} currentNode={currentNode} />
        </ModalBlur>
      </div>
    )
  }
}

List.propTypes = {
  loading: PropTypes.bool,
  dataSource: PropTypes.array,
  storageOverProvisioningPercentage: PropTypes.number,
  minimalSchedulingQuotaWarning: PropTypes.number,
  showAddDiskModal: PropTypes.func,
  showReplicaModal: PropTypes.func,
  showEditDisksModal: PropTypes.func,
  deleteHost: PropTypes.func,
  showDiskReplicaModal: PropTypes.func,
  onAllExpandedOrCollapsed: PropTypes.func,
  sorter: PropTypes.object,
  onSorterChange: PropTypes.func,
  dispatch: PropTypes.func,
  instanceManagerVisible: PropTypes.bool,
  defaultInstanceManager: PropTypes.object,
  defaultEngineImage: PropTypes.object,
  currentNode: PropTypes.object,
}

export default List
