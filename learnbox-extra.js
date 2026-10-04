// Games kept outside this repository.
//
// This copy is empty on purpose. A host with games of its own (LearnBox) serves
// its own learnbox-extra.js at this address instead. index.html loads it after
// data.js and apps.js and before tester.js, so such a file can:
//   - add lists to DATA;
//   - append menu entries to apps.items, each game carrying its own `id` so its
//     address and saved progress survive new games being added here (see
//     findItemByOwnId in tester.js);
//   - register game types: push {appType, create} onto EXTRA_GAME_TYPES, where
//     create(BaseGameComponent) returns the game's component (see
//     getExtraGameRoutes in tester.js).
// It is also loaded by pages that have only apps.js (LearnBox's own menus), so
// it must not assume anything else is defined.
