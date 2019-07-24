import React from 'react'
import PropTypes from 'prop-types'
import { Table, Button, Select, InputNumber, Card, Form, Tooltip } from 'antd'
import { ReactCron } from '../../../components'
import IconRemove from '../../../components/Icon/IconRemove'
import IconRestore from '../../../components/Icon/IconRestore'
import { ModalBlur } from '../../../components'
import { BackupLabelInputForRecurring } from '../../../components'
import prettyCron from '../../../utils/prettycron'
import styles from './index.less'

const Option = Select.Option

class RecurringList extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      dataSource: this.props.dataSource.map(item => ({ ...item })),
      editing: false,
      currentRecord: {},
      currentCron: '0 0 * * *',
      modalOpts: {
        visible: false,
      },
      modalBackupLabesOpts: {
        title: 'Edit Backup Labels',
        visible: false,
      },
      ReactCronKey: Math.random(),
      backupLabelInputKey: Math.random(),
      Faulted: false,
      modulerCronDisabled: false,
      backupLabelsDisabled: false,
    }
  }

  componentDidMount() {
    let Faulted = true
    this.props.dataSourceReplicas.forEach((item) => {
      if (!item.failedAt) {
        Faulted = false
      }
    })
    if (this.props.selectedVolume.standby) {
      Faulted = this.props.selectedVolume.standby
    }
    this.setState({
      ...this.state,
      Faulted,
    })
  }

  UNSAFE_componentWillMount() {
    const { dataSource } = this.state
    dataSource.forEach((data) => { data.editing = false })
  }

  onNewRecurring = () => {
    this.state.dataSource.push({ retain: 20, name: `c-${Math.random().toString(36).substr(2, 6)}`, editing: true, cron: '0 0 * * *', task: 'snapshot', isNew: true })
    this.setState({
      dataSource: this.state.dataSource,
    })
  }

  onDelete = (record) => {
    const index = this.state.dataSource.findIndex(data => data.name === record.name)
    if (record.isNew) {
      this.state.dataSource.splice(index, 1)
    } else {
      let dataSource = this.state.dataSource
      dataSource[index].deleted = true
      dataSource[index].editing = false
      this.setState({ dataSource })
    }
    const dataSource = this.state.dataSource
    this.setState({
      dataSource,
    })
  }

  onEdit = () => {
    const dataSource = this.props.dataSource.map(item => ({ ...item }))
    this.setState({
      dataSource,
      editing: true,
    })
  }

  onCancel = () => {
    const dataSource = this.props.dataSource.map(item => ({ ...item }))
    this.setState({
      dataSource,
      editing: false,
    })
  }

  onRestore = (record) => {
    const found = this.state.dataSource.find(data => data.name === record.name)
    if (found) {
      found.deleted = false
      const dataSource = this.state.dataSource
      this.setState({
        dataSource,
      })
    }
  }

  onScheduleChange = (record, newCron) => {
    const found = this.state.dataSource.find(data => data.name === record.name)
    if (found) {
      found.cron = newCron
      const dataSource = this.state.dataSource
      this.setState({
        dataSource,
      })
    }
  }

  onTaskTypeChange = (record, task) => {
    const found = this.state.dataSource.find(data => data.name === record.name)
    if (found) {
      found.task = task
      const dataSource = this.state.dataSource
      this.setState({
        dataSource,
      })
    }
  }

  onRetainChange = (record, retain) => {
    const found = this.state.dataSource.find(data => data.name === record.name)
    if (found) {
      found.retain = retain
      const dataSource = this.state.dataSource
      this.setState({
        dataSource,
      })
    }
  }

  onSave = () => {
    const { dataSource } = this.state
    const data = dataSource.filter(item => item.deleted !== true)
    this.props.onOk(data)
    this.setState({
      dataSource: data.map(item => ({ ...item, isNew: false })),
      editing: false,
    })
  }

  isRecurringChanged = (origin, target) => {
    const keys = Object.keys(origin)
    let isChanged = false
    for (let i = 0; i < keys.length; i++) {
      if (origin[keys[i]] !== target[keys[i]]) {
        isChanged = true
        break
      }
    }
    return isChanged
  }

  isFormChanged = () => {
    const { dataSource: formData } = this.state
    const { dataSource: originData } = this.props
    if (formData.length !== originData.length) {
      return true
    }
    const deletedItems = formData.filter(item => item.deleted === true)
    if (deletedItems.length !== 0) {
      return true
    }
    const newItems = formData.filter(item => item.isNew === true)
    if (newItems.length !== 0) {
      return true
    }
    let isChanged = false
    for (let i = 0, len = formData.length; i < len; i++) {
      isChanged = this.isRecurringChanged(originData[i], formData[i])
      if (isChanged) {
        break
      }
    }
    return isChanged
  }


  editCron = (record) => {
    this.setState({
      ...this.state,
      currentRecord: record,
    },
    () => {
      this.setState({
        ...this.state,
        modalOpts: {
          visible: true,
        },
        ReactCronKey: Math.random(),
      })
    })
  }

  editBackupLabels = (record) => {
    this.setState({
      ...this.state,
      currentRecord: record,
    },
    () => {
      this.setState({
        ...this.state,
        modalBackupLabesOpts: {
          title: 'Edit Backup Labels',
          visible: true,
        },
        backupLabelInputKey: Math.random(),
      })
    })
  }

  onCronCancel = () => {
    this.setState({
      ...this.state,
      modalOpts: {
        visible: false,
      },
      currentRecord: {},
      currentCron: '0 0 * * *',
    })
  }

  onOk = () => {
    const found = this.state.dataSource.find(data => data.name === this.state.currentRecord.name)
    if (found) {
      found.cron = this.state.currentCron
      const dataSource = this.state.dataSource
      this.setState({
        ...this.state,
        dataSource,
        modalOpts: {
          visible: false,
        },
        currentCron: '0 0 * * *',
      })
    } else {
      this.setState({
        ...this.state,
        modalOpts: {
          visible: false,
        },
        currentCron: '0 0 * * *',
      })
    }
  }

  onBackupLabelsOk = () => {
    const found = this.state.dataSource.find(data => data.name === this.state.currentRecord.name)
    const { getFieldsValue, validateFields } = this.props.form
    let data = {}

    validateFields((errors) => {
      if (errors) {
        return
      }

      if (getFieldsValue().keys && getFieldsValue().key && getFieldsValue().value) {
        getFieldsValue().keys.forEach((item) => {
          data[getFieldsValue().key[item]] = getFieldsValue().value[item]
        })
      }

      if (found) {
        found.labels = data
        const dataSource = this.state.dataSource
        this.setState({
          ...this.state,
          dataSource,
          modalBackupLabesOpts: {
            title: 'Edit Backup Labels',
            visible: false,
          },
          backupLabelInputKey: Math.random(),
        })
      } else {
        this.setState({
          ...this.state,
          modalBackupLabesOpts: {
            title: 'Edit Backup Labels',
            visible: false,
          },
          backupLabelInputKey: Math.random(),
        })
      }
    })
  }

  onBackupLabelsCancel = () => {
    this.setState({
      ...this.state,
      modalBackupLabesOpts: {
        title: 'Edit Backup Labels',
        visible: false,
      },
      backupLabelInputKey: Math.random(),
    })
  }

  changeCron = (cron) => {
    this.setState({
      ...this.state,
      currentCron: cron,
      modulerCronDisabled: false,
    })
  }

  saveDisabled = () => {
    this.setState({
      ...this.state,
      modulerCronDisabled: true,
    })
  }

  labelsElement = (labels) => {
    let key = []
    let value = []

    for (let item in labels) {
      if (labels[item]) {
        key.push(item)
        value.push(labels[item])
      }
    }

    if (key.length > 0) {
      return key.map((ele, index) => {
        return <div key={index}> {ele} : {value[index]} </div>
      })
    }

    return <div>No Labels</div>
  }

  render() {
    const columns = [
      {
        title: 'Type',
        dataIndex: 'task',
        key: 'task',
        width: 120,
        render: (text, record) => {
          return (
            this.state.editing ? <div>
                <Select disabled={record.deleted} onChange={(value) => this.onTaskTypeChange(record, value)} defaultValue={record.task} style={{ width: 100 }}>
                  <Option value="snapshot">Snapshot</Option>
                  <Option value="backup">Backup</Option>
                </Select>
              </div> : <div className="capitalize">
                {text}
              </div>
          )
        },
      }, {
        title: 'Schedule',
        key: 'schedule',
        render: (record) => {
          return (
            <Tooltip placement="top" title={!this.state.editing ? '' : 'Click edit Cron'}>
              <span
                style={{ maxWidth: '500px', display: 'inline-block', color: !this.state.editing ? '#666' : '#108ee9', cursor: !this.state.editing ? 'auto' : 'pointer' }}
                onClick={() => {
                  if (!this.state.editing) {
                    return
                  }
                  this.editCron(record)
                }}>
                {prettyCron.toString(record.cron)}
              </span>
            </Tooltip>
          )
        },
      },
      {
        title: 'Labels',
        key: 'LabelsValue',
        render: (record) => {
          return (
            <Tooltip placement="top" title={!this.state.editing || record.task !== 'backup' ? '' : 'Click add labels'}>
              <div
                style={{ minWidth: '200px', maxWidth: '500px', color: !this.state.editing || record.task !== 'backup' ? '#666' : '#108ee9', cursor: !this.state.editing || record.task !== 'backup' ? 'auto' : 'pointer' }}
                onClick={() => {
                  if (!this.state.editing || record.task !== 'backup') {
                    return
                  }
                  this.editBackupLabels(record)
                }}>
              {record.task === 'backup' ? this.labelsElement(record.labels) : <span></span>}
              </div>
            </Tooltip>
          )
        },
      },
      {
        title: 'Retain',
        dataIndex: 'retain',
        key: 'retain',
        width: 120,
        render: (text, record) => {
          return (
            this.state.editing ? <div>
                <InputNumber disabled={record.deleted} min={1} value={text} onChange={(value) => this.onRetainChange(record, value)} />
              </div> : <div>
                {text}
              </div>
          )
        },
      },
      {
        title: '',
        key: 'operation',
        width: 100,
        render: (text, record) => {
          if (this.state.editing) {
            return (
              <div style={{ textAlign: 'right' }}>
              {!record.deleted && <a onClick={() => this.onDelete(record)}> <IconRemove /> </a>}
              {record.deleted && <a onClick={() => this.onRestore(record)}> <IconRestore /> </a>}
              </div>
            )
          }
          return null
        },
      },
    ]
    const pagination = false
    const { dataSource } = this.state
    const { loading } = this.props
    return (
      <Card title={<div className={styles.header}>
          <div>Recurring Snapshot and Backup Schedule</div>
          <div>
            {!this.state.editing && !loading && <Button disabled={this.state.Faulted} onClick={this.onEdit} type="primary" icon="edit">Edit</Button>}
          </div>
        </div>}
        bordered={false}>
        <div>
          <Table
            bordered={false}
            columns={columns}
            dataSource={dataSource}
            simple
            pagination={pagination}
            rowKey={record => record.name}
          />
          <div className={styles.new}>
              {this.state.editing && <Button onClick={this.onNewRecurring} icon="plus">New</Button>}
          </div>
          <div className={styles.actions}>
            {(this.state.editing || loading) && <div>
              <Button loading={loading} onClick={this.onCancel}>Cancel</Button>
              &nbsp;&nbsp;<Button loading={loading} onClick={this.onSave} type="success">Save</Button>
            </div>}
          </div>
        </div>
        <ModalBlur key={this.state.backupLabelInputKey} {...this.state.modalBackupLabesOpts} width={520} onCancel={() => { this.onBackupLabelsCancel() }} onOk={() => { this.onBackupLabelsOk() }}>
          <BackupLabelInputForRecurring form={this.props.form} labelsProps={this.state.currentRecord.labels} />
        </ModalBlur>
        <ModalBlur disabled={this.state.modulerCronDisabled} {...this.state.modalOpts} width={880} onCancel={() => { this.onCronCancel() }} onOk={() => { this.onOk() }}>
          <ReactCron cron={this.state.currentRecord.cron} key={this.state.ReactCronKey} saveDisabled={this.saveDisabled} changeCron={this.changeCron} />
        </ModalBlur>
      </Card>
    )
  }
}

RecurringList.propTypes = {
  dataSource: PropTypes.array,
  onOk: PropTypes.func,
  getFieldsValue: PropTypes.func,
  validateFields: PropTypes.func,
  loading: PropTypes.bool,
  form: PropTypes.object,
  dataSourceReplicas: PropTypes.array,
  selectedVolume: PropTypes.object,
}

const RecurringListEle = Form.create({})(RecurringList)
export default RecurringListEle
