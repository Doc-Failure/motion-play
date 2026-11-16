import Phaser from 'phaser'

class WelcomeScene extends Phaser.Scene {
  constructor() {
    super('welcome')
  }

  create() {
    const { width, height } = this.scale
    this.cameras.main.setBackgroundColor('#2d6a8a')
    this.add
      .text(width / 2, height / 2, 'Ready to move!', {
        color: '#fff8df',
        fontFamily: '"Motion Hand", cursive',
        fontSize: '32px',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
  }
}

export function createGame(parent: HTMLElement): Phaser.Game {
  return new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width: 800,
    height: 450,
    backgroundColor: '#2d6a8a',
    scene: WelcomeScene,
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
  })
}
