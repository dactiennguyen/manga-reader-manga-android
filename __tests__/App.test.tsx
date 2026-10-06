import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import App from '../App';

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

test('khởi động vào trình duyệt với trang chủ', async () => {
  let renderer!: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(<App />);
  });

  const texts = renderer.root
    .findAll(node => typeof node.props.children === 'string')
    .map(node => node.props.children as string);
  expect(texts).toContain('Manga Reader');

  await ReactTestRenderer.act(async () => {
    renderer.unmount();
  });
});
