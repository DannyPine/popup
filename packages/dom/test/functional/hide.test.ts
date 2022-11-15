import {test, expect} from '@playwright/test';
import {click} from './utils/click';

test('yellow once it has escaped', async ({page}) => {
  await page.goto('http://localhost:1234/hide');

  await page.evaluate(() => {
    const scroll = document.querySelector('.scroll');
    if (scroll) {
      scroll.scrollTop = 450;
    }
  });

  expect(await page.locator('.container').screenshot()).toMatchSnapshot(
    `hide-escaped.png`
  );
});

test('black once reference is hidden', async ({page}) => {
  await page.goto('http://localhost:1234/hide');

  await page.evaluate(() => {
    const scroll = document.querySelector('.scroll');
    if (scroll) {
      scroll.scrollTop = 300;
    }
  });

  expect(await page.locator('main').screenshot()).toMatchSnapshot(
    `hide-reference-hidden.png`
  );
});

test('not black or yellow while still within bounds', async ({page}) => {
  await page.goto('http://localhost:1234/hide');

  await page.evaluate(() => {
    const scroll = document.querySelector('.scroll');
    if (scroll) {
      scroll.scrollTop = 908;
      scroll.scrollLeft = 264;
    }
  });

  expect(await page.locator('.container').screenshot()).toMatchSnapshot(
    `hide-within-bounds.png`
  );
});

test('black while reference is hidden, without escaping', async ({page}) => {
  await page.goto('http://localhost:1234/hide');

  await page.evaluate(() => {
    const scroll = document.querySelector('.scroll');
    if (scroll) {
      scroll.scrollTop = 920;
    }
  });

  expect(await page.locator('.container').screenshot()).toMatchSnapshot(
    `hide-reference-hidden-no-escape.png`
  );
});

['a', 'b', 'c', 'd', 'g', 'i'].forEach((hierarchy) => {
  test(`floating element is not black ${hierarchy}`, async ({page}) => {
    await page.goto('http://localhost:1234/hide');
    await click(page, `[data-testid="hierarchy-${hierarchy}"]`);

    expect(await page.locator('.container').screenshot()).toMatchSnapshot(
      `not-black-${hierarchy}.png`
    );
  });
});

['e', 'h'].forEach((hierarchy) => {
  test(`floating element is black ${hierarchy}`, async ({page}) => {
    await page.goto('http://localhost:1234/hide');
    await click(page, `[data-testid="hierarchy-${hierarchy}"]`);

    expect(await page.locator('.container').screenshot()).toMatchSnapshot(
      `black-${hierarchy}.png`
    );
  });
});

['f'].forEach((hierarchy) => {
  test(`floating element is yellow ${hierarchy}`, async ({page}) => {
    await page.goto('http://localhost:1234/hide');
    await click(page, `[data-testid="hierarchy-${hierarchy}"]`);

    expect(await page.locator('.container').screenshot()).toMatchSnapshot(
      `yellow-${hierarchy}.png`
    );
  });
});
