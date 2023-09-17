import React, { memo, useContext, useEffect, useState, forwardRef, ForwardedRef, useImperativeHandle } from 'react';
import styles from './index.less';
import classnames from 'classnames';
import { MenuOutlined } from '@ant-design/icons';
import type { DragEndEvent } from '@dnd-kit/core';
import { DndContext } from '@dnd-kit/core';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import { Table, InputNumber, Input, Form, Select, Checkbox, Button } from 'antd';
import { v4 as uuidv4 } from 'uuid';
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import sqlService from '@/service/sql';
import { Context } from '../index';
import { IColumnItem } from '@/typings'
import i18n from '@/i18n';

interface RowProps extends React.HTMLAttributes<HTMLTableRowElement> {
  'data-row-key': string;
}

interface IProps {

}

export interface IColumnListRef {
  getColumnListInfo: () => IColumnItem[];
}

const Row = ({ children, ...props }: RowProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: props['data-row-key'],
  });

  const style: React.CSSProperties = {
    ...props.style,
    transform: CSS.Transform.toString(transform && { ...transform, scaleY: 1 }),
    transition,
    ...(isDragging ? { position: 'relative', zIndex: 9999 } : {}),
  };

  return (
    <tr {...props} ref={setNodeRef} style={style} {...attributes}>
      {React.Children.map(children, (child) => {
        if ((child as React.ReactElement).key === 'sort') {
          return React.cloneElement(child as React.ReactElement, {
            children: (
              <MenuOutlined
                ref={setActivatorNodeRef}
                style={{ touchAction: 'none', cursor: 'move' }}
                {...listeners}
              />
            ),
          });
        }
        return child;
      })}
    </tr>
  );
};

const createInitialData = () => {
  return {
    key: uuidv4(),
    name: null,
    columnSize: null,
    columnType: null,
    nullable: null,
    comment: null,
    primaryKey: null,
    defaultValue: null,
    dataType: null,
    autoIncrement: null,
    numericPrecision: null,
    numericScale: null,
    characterMaximumLength: null,
  };
}

const ColumnList = forwardRef((props: IProps, ref: ForwardedRef<IColumnListRef>) => {
  const { dataSourceId, databaseName, tableDetails } = useContext(Context);
  const [dataSource, setDataSource] = useState<IColumnItem[]>([createInitialData()]);
  const [form] = Form.useForm();
  const [editingKey, setEditingKey] = useState('');
  const [databaseFieldTypeList, setDatabaseFieldTypeList] = useState<string[]>([])

  const isEditing = (record: IColumnItem) => record.key === editingKey;

  const edit = (record: Partial<IColumnItem> & { key: React.Key }) => {
    form.setFieldsValue({ ...record });
    setEditingKey(record.key);
  };

  useEffect(() => {
    if (tableDetails) {
      const list = tableDetails?.columnList?.map(t => {
        return {
          ...t,
          key: uuidv4(),
        }
      }) || []
      setDataSource(list)
    }
  }, [tableDetails])

  useEffect(() => {
    // 获取数据库字段类型列表
    sqlService.getDatabaseFieldTypeList({
      dataSourceId,
      databaseName,
    }).then(res => {
      setDatabaseFieldTypeList(res.map(i => i.typeName))
    })
  }, [])

  const columns = [
    {
      key: 'sort',
      width: '40px',
      align: 'center'
    },
    {
      title: i18n('editTable.label.columnName'),
      dataIndex: 'name',
      width: '160px',
      render: (text: string, record: IColumnItem) => {
        const editable = isEditing(record);
        return editable ? (
          <Form.Item
            name="name"
            style={{ margin: 0 }}
          >
            <Input />
          </Form.Item>
        ) : (
          <div
            className={styles.editableCell}
            onClick={() => edit(record)}
          >
            {text}
          </div>
        );
      }
    },
    {
      title: i18n('editTable.label.columnSize'),
      dataIndex: 'columnSize',
      width: '120px',
      render: (text: string, record: IColumnItem) => {
        const editable = isEditing(record);
        return editable ? (
          <Form.Item
            name="columnSize"
            style={{ margin: 0 }}
          >
            <InputNumber />
          </Form.Item>
        ) : (
          <div
            className={styles.editableCell}
            onClick={() => edit(record)}
          >
            {text}
          </div>
        );
      }
    },
    {
      title: i18n('editTable.label.columnType'),
      dataIndex: 'columnType',
      width: '200px',
      render: (text: string, record: IColumnItem) => {
        const editable = isEditing(record);
        return <div>
          {
            editable ? (
              <Form.Item
                name="columnType"
                style={{ margin: 0, maxWidth: '184px' }}
              >
                <Select
                  options={databaseFieldTypeList.map((i) => ({ label: i, value: i }))}
                />
              </Form.Item>
            ) : (
              <div
                style={{ maxWidth: '184px' }}
                className={styles.editableCell}
                onClick={() => edit(record)}
              >
                {text}
              </div>
            )
          }
        </div>
      }
    },
    {
      title: i18n('editTable.label.nullable'),
      dataIndex: 'nullable',
      width: '100px',
      render: (nullable: number, record: IColumnItem) => {
        const editable = isEditing(record);
        return editable ? (
          <Form.Item
            name='nullable'
            style={{ margin: 0 }}
            valuePropName='checked'
          >
            <Checkbox checked={nullable === 1} />
          </Form.Item>
        ) : (
          <div
            onClick={() => edit(record)}
          >
            <Checkbox checked={nullable === 1} />
          </div>
        );
      }
    },
    {
      title: i18n('editTable.label.comment'),
      dataIndex: 'comment',
      render: (text: string, record: IColumnItem) => {
        const editable = isEditing(record);
        return editable ? (
          <Form.Item
            name="comment"
            style={{ margin: 0 }}
          >
            <Input />
          </Form.Item>
        ) : (
          <div
            className={styles.editableCell}
            onClick={() => edit(record)}
          >
            {text}
          </div>
        );
      }
    },
  ];

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (active.id !== over?.id) {
      setDataSource((previous) => {
        const activeIndex = previous.findIndex((i) => i.key === active.id);
        const overIndex = previous.findIndex((i) => i.key === over?.id);
        return arrayMove(previous, activeIndex, overIndex);
      });
    }
  };

  const handelFieldsChange = (field: any) => {
    let { name: nameList, value } = field[0];
    const name = nameList[0];
    if (name === 'nullable') {
      value = value ? 1 : 0
    }
    const newData = dataSource.map((item) => {
      if (item.key === editingKey) {
        return {
          ...item,
          [name]: value,
        };
      }
      return item;
    });
    setDataSource(newData);
  }

  const addData = () => {
    const newData = createInitialData()
    setDataSource([...dataSource, newData])
    edit(newData)
  }

  const deleteData = () => {
    setDataSource(dataSource.filter(i => i.key !== editingKey))
  }

  const moveData = (action: 'up' | 'down') => {
    const index = dataSource.findIndex(i => i.key === editingKey)
    if (index === -1) {
      return
    }
    if (action === 'up') {
      if (index === 0) {
        return
      }
      const newData = [...dataSource]
      newData[index] = dataSource[index - 1]
      newData[index - 1] = dataSource[index]
      setDataSource(newData)
    } else {
      if (index === dataSource.length - 1) {
        return
      }
      const newData = [...dataSource]
      newData[index] = dataSource[index + 1]
      newData[index + 1] = dataSource[index]
      setDataSource(newData)
    }
  }

  function getColumnListInfo(): IColumnItem[] {
    return dataSource
  }

  useImperativeHandle(ref, () => ({
    getColumnListInfo,
  }));

  return (
    <div className={styles.box}>
      <div className={styles.columnListHeader}>
        <Button onClick={addData}>{i18n('editTable.button.add')}</Button>
        <Button onClick={deleteData}>{i18n('editTable.button.delete')}</Button>
        <Button onClick={moveData.bind(null, 'up')}>{i18n('editTable.button.up')}</Button>
        <Button onClick={moveData.bind(null, 'down')}>{i18n('editTable.button.down')}</Button>
      </div>
      <div className={styles.tableBox}>
        <Form form={form} onFieldsChange={handelFieldsChange}>
          <DndContext modifiers={[restrictToVerticalAxis]} onDragEnd={onDragEnd}>
            <SortableContext
              items={dataSource.map((i) => i.key)}
              strategy={verticalListSortingStrategy}
            >
              <Table
                components={{
                  body: {
                    row: Row,
                  },
                }}
                pagination={false}
                rowKey="key"
                columns={columns as any}
                dataSource={dataSource}
              />
            </SortableContext>
          </DndContext>
        </Form>
      </div>
    </div>
  );
})

export default ColumnList;
