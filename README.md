![logo](https://raw.githubusercontent.com/wiki/kcapp/smartboard/images/logo.png)
# smartboard
Integration of [Unicorn Smartboard](https://www.unicornsmartboard.com/smartboard.html) into kcapp


## Usage
For detailed information and usage, see the [Wiki](https://github.com/kcapp/smartboard/wiki)

### Connect
```javascript
var smartboard = require('./smartboard')("<smartboard uuid>", <button number>);

// Start scanning for the board
smartboard.startScan();
// Register a connect callback, which will be called once board has been found, and connection has been established
smartboard.connect((peripheral) => {
    smartboard.initialize(peripheral,
        (dart) => {
            // Dart throw callback
        },
        () => {
            // Button pressed callback
        }
    );
});
```

#### Values
`dart` object returned contains the following
```javascript
var dart = {
  score: int ,
  multiplier: int
};
```
`score` wil be the value of the field, while `mulitplier` will be one the following
```
0 - single (thin)
1 - single (fat)
2 - double
3 - triple
```

### Disconnect
```javascript
smartboard.disconnect(peripheral, () => {
    // Disconnected
 });
```

