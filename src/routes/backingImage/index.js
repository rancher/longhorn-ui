import React from 'react'
import PropTypes from 'prop-types'
import { routerRedux } from 'dva/router'
import { connect } from 'dva'
import { Row, Col, Button } from 'antd'
import CreateBackingImage from './CreateBackingImage'
import BackingImageList from './BackingImageList'
import DiskStateMapDetail from './DiskStateMapDetail'
import { Filter } from '../../components/index'
import BackingImageBulkActions from './BackingImageBulkActions'
import queryString from 'query-string'

class BackingImage extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      height: 300,
    }
  }

  componentDidMount() {
    let height = document.getElementById('backingImageTable').offsetHeight - 109
    this.setState({
      height,
    })
    window.onresize = () => {
      height = document.getElementById('backingImageTable').offsetHeight - 109
      this.setState({
        height,
      })
      this.props.dispatch({ type: 'app/changeNavbar' })
    }
  }

  render() {
    const { dispatch, loading, location } = this.props
    const { data, selected, createBackingImageModalVisible, createBackingImageModalKey, diskStateMapDetailModalVisible, diskStateMapDetailModalKey, diskStateMapDeleteDisabled, diskStateMapDeleteLoading, selectedDiskStateMapRows, selectedDiskStateMapRowKeys, selectedRows } = this.props.backingImage
    const { field, value } = queryString.parse(this.props.location.search)
    let backingImages = data.filter((item) => {
      if (field && value) {
        return item[field] && item[field].indexOf(value.trim()) > -1
      }
      return true
    })
    if (backingImages && backingImages.length > 0) {
      backingImages.sort((a, b) => a.name.localeCompare(b.name))
    }
    const backingImageListProps = {
      dataSource: backingImages,
      height: this.state.height,
      loading,
      deleteBackingImage(record) {
        dispatch({
          type: 'backingImage/delete',
          payload: record,
        })
      },
      showDiskStateMapDetail(record) {
        dispatch({
          type: 'backingImage/showDiskStateMapDetailModal',
          payload: record,
        })
      },
      rowSelection: {
        selectedRowKeys: selectedRows.map(item => item.id),
        onChange(_, records) {
          dispatch({
            type: 'backingImage/changeSelection',
            payload: {
              selectedRows: records,
            },
          })
        },
      },
    }

    const addBackingImage = () => {
      dispatch({
        type: 'backingImage/showCreateBackingImageModal',
      })
    }

    const createBackingImageModalProps = {
      item: {
        name: '',
        url: '',
      },
      visible: createBackingImageModalVisible,
      onOk(newBackingImage) {
        let params = {}
        params.name = newBackingImage.name
        if (newBackingImage.requireUpload) {
          params.sourceType = 'upload'
          params.parameters = {}
        } else {
          params.sourceType = 'download'
          params.parameters = {
            url: newBackingImage.imageURL,
          }
        }

        dispatch({
          type: 'backingImage/create',
          payload: params,
          callback: () => {
            // to do upload
          },
        })
      },
      onCancel() {
        dispatch({
          type: 'backingImage/hideCreateBackingImageModal',
        })
        dispatch({
          type: 'app/changeBlur',
          payload: false,
        })
      },
    }

    const diskStateMapDetailModalProps = {
      selected,
      backingImages,
      visible: diskStateMapDetailModalVisible,
      onCancel: () => {
        dispatch({ type: 'backingImage/hideDiskStateMapDetailModal' })
        dispatch({ type: 'backingImage/disableDiskStateMapDelete' })
        dispatch({
          type: 'backingImage/changeDiskStateMapSelection',
          payload: {
            selectedDiskStateMapRowKeys: [],
            selectedDiskStateMapRows: [],
          },
        })
      },
      deleteDisksOnBackingImage: (record) => {
        dispatch({
          type: 'backingImage/deleteDisksOnBackingImage',
          payload: {
            selected,
            rows: record,
          },
        })
      },
      selectedRows: selectedDiskStateMapRows,
      rowSelection: {
        selectedRowKeys: selectedDiskStateMapRowKeys,
        onChange: (selectedDiskRowKeys, selectedDiskRows) => {
          if (selectedDiskRowKeys.length === 0) {
            dispatch({ type: 'backingImage/disableDiskStateMapDelete' })
          } else {
            dispatch({ type: 'backingImage/enableDiskStateMapDelete' })
          }
          dispatch({
            type: 'backingImage/changeDiskStateMapSelection',
            payload: {
              selectedDiskStateMapRowKeys: selectedDiskRowKeys,
              selectedDiskStateMapRows: selectedDiskRows,
            },
          })
        },
      },
      diskStateMapDeleteDisabled,
      diskStateMapDeleteLoading,
    }

    const backingImageFilterProps = {
      location,
      defaultField: 'name',
      fieldOption: [
        { value: 'name', name: 'Name' },
      ],
      onSearch(filter) {
        const { field: filterField, value: filterValue } = filter
        filterField && filterValue ? dispatch(routerRedux.push({
          pathname: '/backingImage',
          search: queryString.stringify({
            ...queryString.parse(location.search),
            field: filterField,
            value: filterValue,
          }),
        })) : dispatch(routerRedux.push({
          pathname: '/backingImage',
          search: queryString.stringify({}),
        }))
      },
    }

    const backingImageBulkActionsProps = {
      selectedRows,
      deleteBackingImages(record) {
        dispatch({
          type: 'backingImage/bulkDelete',
          payload: record,
        })
      },
    }

    return (
      <div className="content-inner" style={{ display: 'flex', flexDirection: 'column', overflow: 'visible !important' }}>
        <Row gutter={24} style={{ marginBottom: 16 }}>
          <Col lg={{ span: 4 }} md={{ span: 6 }} sm={24} xs={24}>
            <BackingImageBulkActions {...backingImageBulkActionsProps} />
          </Col>
          <Col lg={{ offset: 13, span: 7 }} md={{ offset: 8, span: 10 }} sm={24} xs={24}>
            <Filter {...backingImageFilterProps} />
          </Col>
        </Row>
        <Button style={{ position: 'absolute', top: '-50px', right: '0px' }} size="large" type="primary" onClick={addBackingImage}>Create Backing Image</Button>
        <BackingImageList {...backingImageListProps} />
        { createBackingImageModalVisible ? <CreateBackingImage key={createBackingImageModalKey} {...createBackingImageModalProps} /> : ''}
        { diskStateMapDetailModalVisible ? <DiskStateMapDetail key={diskStateMapDetailModalKey} {...diskStateMapDetailModalProps} /> : ''}
      </div>
    )
  }
}

BackingImage.propTypes = {
  backingImage: PropTypes.object,
  loading: PropTypes.bool,
  location: PropTypes.object,
  dispatch: PropTypes.func,
}

export default connect(({ backingImage, loading }) => ({ backingImage, loading: loading.models.backingImage }))(BackingImage)
