# thelounge-plugin-webcal

[TheLounge](https://thelounge.chat/) plugin that renders `webcal://` URIs as clickable **📅 Add to Calendar** buttons.

TheLounge's linkify engine does not recognise the `webcal://` scheme, so calendar subscription links sent in IRC chat appear as plain unclickable text. This plugin intercepts them via a `MutationObserver` and replaces them with styled buttons that open in the browser — which hands off to the OS default calendar application.

## Install

```sh
thelounge install thelounge-plugin-webcal
```

## Manual install

```sh
THELOUNGE_HOME=$(thelounge --help | grep home | awk '{print $NF}')
mkdir -p $THELOUNGE_HOME/packages/node_modules
cd $THELOUNGE_HOME/packages/node_modules
npm pack thelounge-plugin-webcal
tar xzf thelounge-plugin-webcal-*.tgz
mv package thelounge-plugin-webcal
```

## Pairing with thelounge-theme-daplanet

The button style is overridden by `thelounge-theme-daplanet` to match the Da Planet Security palette. Install both for a cohesive look.

## License

MIT — Da Planet Security, Albany NY
