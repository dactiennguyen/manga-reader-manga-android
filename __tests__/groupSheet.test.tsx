import React from 'react';
import { Text } from 'react-native';
import ReactTestRenderer from 'react-test-renderer';

import { BookmarkDialog } from '../src/features/detail/BookmarkDialog';
import { GroupSheet } from '../src/features/library/GroupSheet';
import { useLibrary } from '../src/store/useLibrary';

const add = (key: string, groups: string[]) =>
  useLibrary.getState().addBookmark({ key, sourceId: 's', url: key, title: key, content: 'manga', groups });

let mounted: ReactTestRenderer.ReactTestRenderer | undefined;

async function render(element: React.ReactElement) {
  await ReactTestRenderer.act(async () => {
    mounted = ReactTestRenderer.create(element);
  });
  return mounted!;
}

function checks(renderer: ReactTestRenderer.ReactTestRenderer) {
  const nodes = renderer.root.findAll(
    node => node.props.accessibilityRole === 'checkbox' && typeof node.props.onPress === 'function',
    { deep: false },
  );
  return nodes.map(node => ({
    label: node.findAllByType(Text).at(-1)?.props.children as string,
    checked: node.props.accessibilityState.checked as boolean | 'mixed',
    press: () => ReactTestRenderer.act(async () => node.props.onPress()),
  }));
}

function pressButton(renderer: ReactTestRenderer.ReactTestRenderer, title: string) {
  const [button] = renderer.root.findAll(
    node => node.props.accessibilityRole === 'button' && node.findAllByProps({ children: title }).length > 0,
    { deep: false },
  );
  return ReactTestRenderer.act(async () => button.props.onPress());
}

beforeEach(() => {
  useLibrary.getState().clear();
  for (const name of ['Action', 'Later', 'Cũ']) {
    useLibrary.getState().addGroup(name);
  }
  add('a', ['Action', 'Later']);
  add('b', ['Action']);
});

afterEach(async () => {
  await ReactTestRenderer.act(async () => mounted?.unmount());
  mounted = undefined;
});

test('Đặt nhóm: tri-state theo các truyện đã chọn, chỉ áp dụng nhóm đã đổi', async () => {
  const onApply = jest.fn();
  const renderer = await render(<GroupSheet visible keys={['a', 'b']} onClose={jest.fn()} onApply={onApply} />);
  const state = () => checks(renderer).map(c => [c.label, c.checked]);
  expect(state()).toEqual([
    ['Action', true],
    ['Later', 'mixed'],
    ['Cũ', false],
  ]);

  await checks(renderer)[1].press();
  await checks(renderer)[0].press();
  await checks(renderer)[2].press();
  await checks(renderer)[2].press();
  expect(state()).toEqual([
    ['Action', false],
    ['Later', true],
    ['Cũ', false],
  ]);

  await pressButton(renderer, 'Áp dụng');
  expect(onApply).toHaveBeenCalledWith({ add: ['Later'], remove: ['Action'] });
});

test('BookmarkDialog lưu nhiều nhóm cho truyện đã bookmark', async () => {
  const renderer = await render(
    <BookmarkDialog
      visible
      onClose={jest.fn()}
      target={{ key: 'b', sourceId: 's', url: 'b', title: 'b', content: 'manga', chapters: [] }}
    />,
  );
  expect(checks(renderer).map(c => c.checked)).toEqual([true, false, false]);
  await checks(renderer)[1].press();
  await checks(renderer)[2].press();
  await pressButton(renderer, 'Lưu thay đổi');
  expect(useLibrary.getState().bookmarks.b.groups).toEqual(['Action', 'Later', 'Cũ']);
});
