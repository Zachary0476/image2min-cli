# image2min

> Minify images(Base on imagemin-cli)

## Install

```sh
npm install --global image2min
```

## Usage

```
$ image2min --help

  Usage
    $ image2min <path|glob> ... --out-dir=build [--plugin=<name> ...]
    $ image2min <file> > <output>
    $ cat <file> | image2min > <output>

  Options
    --plugin, -p   Override the default plugins
    --out-dir, -o  Output directory

  Examples
    $ image2min images/*   【Maintain the file tree and replace all existing resources】
    $ image2min images/* --out-dir=build
    $ image2min foo.png > foo-optimized.png
    $ cat foo.png | image2min > foo-optimized.png
    $ image2min foo.png --plugin=pngquant > foo-optimized.png
    $ image2min foo.png --plugin.pngquant.quality=0.1 --plugin.pngquant.quality=0.2 > foo-optimized.png
    # Non-Windows platforms may support the short CLI syntax for array arguments
    $ image2min foo.png --plugin.pngquant.quality={0.1,0.2} > foo-optimized.png
    $ image2min foo.png --plugin.webp.quality=95 --plugin.webp.preset=icon > foo-icon.webp
```

## Related

- [image2min](https://github.com/Zachary0476/image2min-cli.git) - API for this module
